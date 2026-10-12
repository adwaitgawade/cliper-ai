"""Request dependencies: the authenticated principal, workspace scoping, rate limits."""

import time
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal

import structlog
from fastapi import Depends, Header, Request
from redis.asyncio import Redis
from sqlalchemy import select, text, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import TokenClaims, api_key_matches, get_verifier, parse_api_key
from app.core.config import get_settings
from app.core.errors import Forbidden, NotFound, RateLimited, Unauthorized
from app.core.ids import uuid7
from app.db.models import ApiKey, Base, User, Workspace, WorkspaceMember, WorkspaceRole
from app.db.session import get_db

log = structlog.get_logger()

DB = Annotated[AsyncSession, Depends(get_db)]

_ROLE_RANK = {WorkspaceRole.member: 0, WorkspaceRole.admin: 1, WorkspaceRole.owner: 2}


@dataclass(frozen=True)
class Principal:
    user_id: uuid.UUID
    email: str | None
    workspace_id: uuid.UUID
    role: WorkspaceRole
    via: Literal["jwt", "api_key"]
    api_key_id: uuid.UUID | None = None

    def has_role(self, minimum: WorkspaceRole) -> bool:
        return _ROLE_RANK[self.role] >= _ROLE_RANK[minimum]


async def provision_user(db: AsyncSession, user_id: uuid.UUID, email: str | None) -> uuid.UUID:
    """Create the user mirror row and their personal workspace. Safe under concurrency."""
    try:
        await db.execute(
            pg_insert(User)
            .values(id=user_id, email=email)
            .on_conflict_do_update(index_elements=[User.id], set_={"email": email})
        )
        name = f"{email.split('@')[0]}'s workspace" if email else "Personal workspace"
        ws_id = (
            await db.execute(
                pg_insert(Workspace)
                .values(id=uuid7(), name=name, is_personal=True, created_by=user_id)
                .on_conflict_do_nothing(index_elements=[Workspace.created_by], index_where=text("is_personal"))
                .returning(Workspace.id)
            )
        ).scalar_one_or_none()
        if ws_id is None:
            ws_id = (
                await db.execute(
                    select(Workspace.id).where(Workspace.created_by == user_id, Workspace.is_personal.is_(True))
                )
            ).scalar_one()
        await db.execute(
            pg_insert(WorkspaceMember)
            .values(workspace_id=ws_id, user_id=user_id, role=WorkspaceRole.owner)
            .on_conflict_do_nothing()
        )
        await db.commit()
    except IntegrityError as e:
        # The Supabase user no longer exists (deleted while the token is still valid).
        await db.rollback()
        raise Unauthorized("User does not exist", code="invalid_token") from e
    return ws_id


async def _membership(db: AsyncSession, user_id: uuid.UUID, workspace_id: uuid.UUID | None) -> WorkspaceMember | None:
    stmt = select(WorkspaceMember).where(WorkspaceMember.user_id == user_id)
    if workspace_id is not None:
        stmt = stmt.where(WorkspaceMember.workspace_id == workspace_id)
    else:
        stmt = stmt.join(Workspace).where(Workspace.is_personal.is_(True), Workspace.created_by == user_id)
    return (await db.execute(stmt)).scalar_one_or_none()


async def _principal_from_jwt(db: AsyncSession, claims: TokenClaims, workspace_id: uuid.UUID | None) -> Principal:
    member = await _membership(db, claims.user_id, workspace_id)
    if member is None and workspace_id is None:
        await provision_user(db, claims.user_id, claims.email)
        member = await _membership(db, claims.user_id, None)
    if member is None:
        raise NotFound("Workspace not found", code="workspace_not_found")
    structlog.contextvars.bind_contextvars(user_id=str(claims.user_id), workspace_id=str(member.workspace_id))
    return Principal(
        user_id=claims.user_id,
        email=claims.email,
        workspace_id=member.workspace_id,
        role=WorkspaceRole(member.role),
        via="jwt",
    )


async def _principal_from_api_key(db: AsyncSession, key: str) -> Principal:
    prefix = parse_api_key(key)
    if prefix is None:
        raise Unauthorized("Invalid API key", code="invalid_api_key")
    row = (
        await db.execute(
            select(ApiKey, WorkspaceMember)
            .join(
                WorkspaceMember,
                (WorkspaceMember.workspace_id == ApiKey.workspace_id) & (WorkspaceMember.user_id == ApiKey.created_by),
            )
            .where(ApiKey.prefix == prefix, ApiKey.revoked_at.is_(None))
        )
    ).first()
    if row is None or not api_key_matches(key, row.ApiKey.key_hash):
        raise Unauthorized("Invalid API key", code="invalid_api_key")
    api_key: ApiKey = row.ApiKey
    now = datetime.now(UTC)
    if api_key.last_used_at is None or now - api_key.last_used_at > timedelta(minutes=5):
        await db.execute(update(ApiKey).where(ApiKey.id == api_key.id).values(last_used_at=now))
        await db.commit()
    structlog.contextvars.bind_contextvars(user_id=str(api_key.created_by), workspace_id=str(api_key.workspace_id))
    # API keys act with member permissions: they cannot manage workspaces or keys.
    return Principal(
        user_id=api_key.created_by,
        email=None,
        workspace_id=api_key.workspace_id,
        role=WorkspaceRole.member,
        via="api_key",
        api_key_id=api_key.id,
    )


async def get_principal(
    request: Request,
    db: DB,
    authorization: Annotated[str | None, Header()] = None,
    x_api_key: Annotated[str | None, Header()] = None,
    x_workspace_id: Annotated[uuid.UUID | None, Header(description="Workspace to act in (JWT auth only)")] = None,
) -> Principal:
    token: str | None = None
    if authorization:
        scheme, _, value = authorization.partition(" ")
        if scheme.lower() != "bearer" or not value:
            raise Unauthorized("Authorization header must be 'Bearer <token>'")
        token = value.strip()

    if x_api_key or (token and parse_api_key(token)):
        principal = await _principal_from_api_key(db, x_api_key or token or "")
    elif token:
        claims = await get_verifier().verify(token)
        principal = await _principal_from_jwt(db, claims, x_workspace_id)
    else:
        raise Unauthorized("Missing credentials")
    request.state.principal = principal
    return principal


CurrentPrincipal = Annotated[Principal, Depends(get_principal)]


def require_role(minimum: WorkspaceRole, *, jwt_only: bool = False) -> Callable[..., Awaitable[Principal]]:
    async def _dep(principal: CurrentPrincipal) -> Principal:
        if jwt_only and principal.via != "jwt":
            raise Forbidden("This action requires a user session, not an API key")
        if not principal.has_role(minimum):
            raise Forbidden(f"Requires workspace role '{minimum}' or higher")
        return principal

    return _dep


async def get_scoped[M: Base](db: AsyncSession, model: type[M], obj_id: uuid.UUID, principal: Principal) -> M:
    """Fetch a workspace-owned row, or 404. The single choke point for tenant isolation."""
    obj = (
        await db.execute(
            select(model).where(model.id == obj_id, model.workspace_id == principal.workspace_id)  # type: ignore[attr-defined]
        )
    ).scalar_one_or_none()
    if obj is None:
        raise NotFound(f"{model.__name__} not found")
    return obj


# --- rate limiting ----------------------------------------------------------------------

_redis: Redis | None = None


def get_redis() -> Redis:
    global _redis
    if _redis is None:
        _redis = Redis.from_url(get_settings().redis_url, socket_timeout=2, socket_connect_timeout=2)
    return _redis


async def _hit(bucket: str, limit: int, window_s: int) -> None:
    window = int(time.time() // window_s)
    key = f"rl:{bucket}:{window}"
    try:
        redis = get_redis()
        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, window_s)
    except Exception:  # Redis down: fail open rather than take the API down.
        log.warning("rate_limit_unavailable", bucket=bucket)
        return
    if count > limit:
        raise RateLimited("Rate limit exceeded, slow down", details={"limit": limit, "window_seconds": window_s})


async def rate_limit(principal: CurrentPrincipal) -> Principal:
    await _hit(f"user:{principal.user_id}", get_settings().rate_limit_per_minute, 60)
    return principal


async def rate_limit_jobs(principal: CurrentPrincipal) -> Principal:
    await _hit(f"jobs:{principal.workspace_id}", get_settings().rate_limit_jobs_per_hour, 3600)
    return principal
