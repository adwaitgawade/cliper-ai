"""Authentication primitives.

Users sign up and sign in on the frontend with supabase-js (email + password). The
API receives the Supabase access token as `Authorization: Bearer <jwt>` and verifies
it locally against the project's JWKS (asymmetric ES256/RS256 signing keys). Projects
still on the legacy HS256 secret are verified by asking the Auth server instead, as
Supabase recommends.

Integrators can use workspace API keys (`cp_<prefix>_<secret>`) instead of a JWT.
"""

import hashlib
import hmac
import secrets
import uuid
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any

import httpx
import jwt
from starlette.concurrency import run_in_threadpool

from app.core.config import Settings, get_settings
from app.core.errors import AppError, Unauthorized

ASYMMETRIC_ALGS = ("ES256", "RS256")


@dataclass(frozen=True)
class TokenClaims:
    user_id: uuid.UUID
    email: str | None
    session_id: str | None
    raw: dict[str, Any] = field(repr=False)


class SupabaseJWTVerifier:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.jwks = jwt.PyJWKClient(
            settings.jwks_url,
            cache_keys=True,
            lifespan=settings.jwks_cache_seconds,
            timeout=10,
        )

    async def verify(self, token: str) -> TokenClaims:
        try:
            header = jwt.get_unverified_header(token)
        except jwt.PyJWTError as e:
            raise Unauthorized("Malformed access token", code="invalid_token") from e

        alg = header.get("alg")
        if alg in ASYMMETRIC_ALGS:
            claims = await self._verify_with_jwks(token, alg)
        elif alg == "HS256":
            claims = await self._verify_with_auth_server(token)
        else:
            raise Unauthorized("Unsupported token algorithm", code="invalid_token")

        # Only fully signed-in users; anonymous sign-ins also carry the authenticated role.
        if claims.get("role") != "authenticated" or claims.get("is_anonymous"):
            raise Unauthorized("Token is not for an authenticated user", code="invalid_token")
        try:
            user_id = uuid.UUID(str(claims["sub"]))
        except (KeyError, ValueError) as e:
            raise Unauthorized("Token has no valid subject", code="invalid_token") from e
        return TokenClaims(user_id=user_id, email=claims.get("email"), session_id=claims.get("session_id"), raw=claims)

    async def _verify_with_jwks(self, token: str, alg: str) -> dict[str, Any]:
        try:
            signing_key = await run_in_threadpool(self.jwks.get_signing_key_from_jwt, token)
        except jwt.PyJWKClientConnectionError as e:
            raise AppError("Could not reach the auth key server", code="auth_unavailable", status_code=503) from e
        except jwt.PyJWTError as e:
            raise Unauthorized("Unknown signing key", code="invalid_token") from e
        try:
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=[alg],
                audience=self.settings.supabase_jwt_audience,
                issuer=self.settings.supabase_issuer,
                options={"require": ["exp", "sub", "iss", "aud"]},
                leeway=30,
            )
        except jwt.ExpiredSignatureError as e:
            raise Unauthorized("Access token expired", code="token_expired") from e
        except jwt.PyJWTError as e:
            raise Unauthorized("Invalid access token", code="invalid_token") from e

    async def _verify_with_auth_server(self, token: str) -> dict[str, Any]:
        key = self.settings.supabase_publishable_key
        if not key:
            raise Unauthorized("HS256 tokens need SUPABASE_PUBLISHABLE_KEY to be validated", code="invalid_token")
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                resp = await client.get(
                    f"{self.settings.supabase_issuer}/user",
                    headers={"apikey": key, "Authorization": f"Bearer {token}"},
                )
            except httpx.HTTPError as e:
                raise AppError("Could not reach the auth server", code="auth_unavailable", status_code=503) from e
        if resp.status_code != 200:
            raise Unauthorized("Invalid access token", code="invalid_token")
        user = resp.json()
        unverified = jwt.decode(token, options={"verify_signature": False})
        return {**unverified, "sub": user["id"], "email": user.get("email"), "role": user.get("role")}


@lru_cache
def get_verifier() -> SupabaseJWTVerifier:
    return SupabaseJWTVerifier(get_settings())


# --- API keys -------------------------------------------------------------------------

API_KEY_PREFIX = "cp_"


@dataclass(frozen=True)
class GeneratedApiKey:
    key: str
    prefix: str
    key_hash: str


def hash_api_key(key: str) -> str:
    # Keys carry 256 bits of entropy, so a fast hash is sufficient (no need for bcrypt).
    return hashlib.sha256(key.encode()).hexdigest()


def generate_api_key() -> GeneratedApiKey:
    prefix = secrets.token_hex(6)
    key = f"{API_KEY_PREFIX}{prefix}_{secrets.token_urlsafe(32)}"
    return GeneratedApiKey(key=key, prefix=prefix, key_hash=hash_api_key(key))


def parse_api_key(key: str) -> str | None:
    """Return the lookup prefix of a well-formed API key, else None."""
    if not key.startswith(API_KEY_PREFIX):
        return None
    prefix, sep, secret = key.removeprefix(API_KEY_PREFIX).partition("_")
    if not sep or len(prefix) != 12 or not secret:
        return None
    return prefix


def api_key_matches(key: str, key_hash: str) -> bool:
    return hmac.compare_digest(hash_api_key(key), key_hash)
