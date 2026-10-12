"""Current user, workspaces, members and API keys."""

import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select, update

from app.api.auth import generate_api_key
from app.api.deps import DB, CurrentPrincipal, Principal, rate_limit, require_role
from app.core.errors import Conflict, Forbidden, NotFound
from app.core.ids import uuid7
from app.db.models import ApiKey, User, Workspace, WorkspaceMember, WorkspaceRole
from app.schemas.accounts import (
    ApiKeyCreate,
    ApiKeyCreated,
    ApiKeyOut,
    MemberAdd,
    MemberOut,
    MemberUpdate,
    MeOut,
    WorkspaceCreate,
    WorkspaceOut,
)

router = APIRouter(prefix="/v1", tags=["account"], dependencies=[Depends(rate_limit)])

Admin = Annotated[Principal, Depends(require_role(WorkspaceRole.admin, jwt_only=True))]
Owner = Annotated[Principal, Depends(require_role(WorkspaceRole.owner, jwt_only=True))]
SessionUser = Annotated[Principal, Depends(require_role(WorkspaceRole.member, jwt_only=True))]


async def _workspaces(db: DB, user_id: uuid.UUID) -> list[WorkspaceOut]:
    rows = await db.execute(
        select(Workspace, WorkspaceMember.role)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == user_id)
        .order_by(Workspace.is_personal.desc(), Workspace.created_at)
    )
    return [
        WorkspaceOut(id=w.id, name=w.name, is_personal=w.is_personal, role=WorkspaceRole(role), created_at=w.created_at)
        for w, role in rows
    ]


@router.get("/me", response_model=MeOut)
async def me(principal: CurrentPrincipal, db: DB) -> MeOut:
    return MeOut(
        user_id=principal.user_id,
        email=principal.email,
        auth=principal.via,
        current_workspace_id=principal.workspace_id,
        workspaces=await _workspaces(db, principal.user_id) if principal.via == "jwt" else [],
    )


@router.get("/workspaces", response_model=list[WorkspaceOut])
async def list_workspaces(principal: SessionUser, db: DB) -> list[WorkspaceOut]:
    return await _workspaces(db, principal.user_id)


@router.post("/workspaces", response_model=WorkspaceOut, status_code=status.HTTP_201_CREATED)
async def create_workspace(body: WorkspaceCreate, principal: SessionUser, db: DB) -> WorkspaceOut:
    ws = Workspace(id=uuid7(), name=body.name, is_personal=False, created_by=principal.user_id)
    db.add(ws)
    await db.flush()
    db.add(WorkspaceMember(workspace_id=ws.id, user_id=principal.user_id, role=WorkspaceRole.owner))
    await db.commit()
    await db.refresh(ws)
    return WorkspaceOut(id=ws.id, name=ws.name, is_personal=False, role=WorkspaceRole.owner, created_at=ws.created_at)


# --- members of the current workspace (select it with X-Workspace-Id) ------------------


@router.get("/workspace/members", response_model=list[MemberOut])
async def list_members(principal: SessionUser, db: DB) -> list[MemberOut]:
    rows = await db.execute(
        select(WorkspaceMember, User.email)
        .join(User, User.id == WorkspaceMember.user_id)
        .where(WorkspaceMember.workspace_id == principal.workspace_id)
        .order_by(WorkspaceMember.created_at)
    )
    return [
        MemberOut(user_id=m.user_id, email=email, role=WorkspaceRole(m.role), created_at=m.created_at)
        for m, email in rows
    ]


async def _personal(db: DB, workspace_id: uuid.UUID) -> bool:
    return bool((await db.execute(select(Workspace.is_personal).where(Workspace.id == workspace_id))).scalar_one())


@router.post("/workspace/members", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
async def add_member(body: MemberAdd, principal: Admin, db: DB) -> MemberOut:
    if await _personal(db, principal.workspace_id):
        raise Forbidden("Personal workspaces cannot have other members; create a team workspace")
    if body.role == WorkspaceRole.owner and principal.role != WorkspaceRole.owner:
        raise Forbidden("Only owners can add owners")
    user = (await db.execute(select(User).where(func.lower(User.email) == body.email.lower()))).scalar_one_or_none()
    if user is None:
        raise NotFound("No user with that email has signed up yet", code="user_not_found")
    exists = await db.get(WorkspaceMember, (principal.workspace_id, user.id))
    if exists:
        raise Conflict("User is already a member")
    member = WorkspaceMember(workspace_id=principal.workspace_id, user_id=user.id, role=body.role)
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return MemberOut(user_id=user.id, email=user.email, role=body.role, created_at=member.created_at)


async def _owner_count(db: DB, workspace_id: uuid.UUID) -> int:
    return (
        await db.execute(
            select(func.count())
            .select_from(WorkspaceMember)
            .where(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.role == WorkspaceRole.owner)
        )
    ).scalar_one()


@router.patch("/workspace/members/{user_id}", response_model=MemberOut)
async def update_member(user_id: uuid.UUID, body: MemberUpdate, principal: Owner, db: DB) -> MemberOut:
    member = await db.get(WorkspaceMember, (principal.workspace_id, user_id))
    if member is None:
        raise NotFound("Member not found")
    if (
        member.role == WorkspaceRole.owner
        and body.role != WorkspaceRole.owner
        and await _owner_count(db, principal.workspace_id) <= 1
    ):
        raise Conflict("A workspace must keep at least one owner")
    member.role = body.role
    await db.commit()
    email = (await db.execute(select(User.email).where(User.id == user_id))).scalar_one_or_none()
    return MemberOut(user_id=user_id, email=email, role=body.role, created_at=member.created_at)


@router.delete("/workspace/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(user_id: uuid.UUID, principal: Admin, db: DB) -> None:
    member = await db.get(WorkspaceMember, (principal.workspace_id, user_id))
    if member is None:
        raise NotFound("Member not found")
    if member.role == WorkspaceRole.owner:
        if principal.role != WorkspaceRole.owner:
            raise Forbidden("Only owners can remove owners")
        if await _owner_count(db, principal.workspace_id) <= 1:
            raise Conflict("A workspace must keep at least one owner")
    await db.delete(member)
    await db.commit()


# --- API keys ---------------------------------------------------------------------------


@router.get("/api-keys", response_model=list[ApiKeyOut])
async def list_api_keys(principal: Admin, db: DB) -> list[ApiKey]:
    rows = await db.execute(
        select(ApiKey).where(ApiKey.workspace_id == principal.workspace_id).order_by(ApiKey.created_at.desc())
    )
    return list(rows.scalars())


@router.post("/api-keys", response_model=ApiKeyCreated, status_code=status.HTTP_201_CREATED)
async def create_api_key(body: ApiKeyCreate, principal: Admin, db: DB) -> ApiKeyCreated:
    generated = generate_api_key()
    key = ApiKey(
        id=uuid7(),
        workspace_id=principal.workspace_id,
        created_by=principal.user_id,
        name=body.name,
        prefix=generated.prefix,
        key_hash=generated.key_hash,
    )
    db.add(key)
    await db.commit()
    await db.refresh(key)
    return ApiKeyCreated.model_validate({**ApiKeyOut.model_validate(key).model_dump(), "key": generated.key})


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(key_id: uuid.UUID, principal: Admin, db: DB) -> None:
    result = await db.execute(
        update(ApiKey)
        .where(ApiKey.id == key_id, ApiKey.workspace_id == principal.workspace_id, ApiKey.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
    if not result.rowcount:  # type: ignore[attr-defined]
        raise NotFound("API key not found")
    await db.commit()
