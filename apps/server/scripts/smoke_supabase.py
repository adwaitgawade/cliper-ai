"""Check connectivity to the configured Supabase project.

    uv run python -m scripts.smoke_supabase
    SMOKE_EMAIL=... SMOKE_PASSWORD=... uv run python -m scripts.smoke_supabase   # also signs in

Checks: JWKS signing keys, database connection and migration state, and optionally an
email/password sign-in whose access token is verified exactly as the API does.
"""

import asyncio
import os
import sys

import httpx
from sqlalchemy import create_engine, text

from app.api.auth import get_verifier
from app.core.config import get_settings


def main() -> int:
    s = get_settings()
    ok = True

    print(f"Supabase: {s.supabase_url}")
    try:
        keys = httpx.get(s.jwks_url, timeout=10).raise_for_status().json().get("keys", [])
        algs = sorted({k.get("alg", "?") for k in keys})
        print(f"  JWKS: {len(keys)} key(s) {algs}" if keys else "  JWKS: no asymmetric keys (legacy HS256 project)")
        if not keys and not s.supabase_publishable_key:
            print("  ! Set SUPABASE_PUBLISHABLE_KEY or migrate to asymmetric JWT signing keys")
            ok = False
    except Exception as e:
        print(f"  ! JWKS fetch failed: {e}")
        ok = False

    try:
        engine = create_engine(s.database_url, connect_args={"prepare_threshold": None})
        with engine.connect() as conn:
            version = conn.execute(text("show server_version")).scalar()
            revision = conn.execute(
                text("select version_num from app.alembic_version")
                if conn.execute(text("select to_regclass('app.alembic_version')")).scalar()
                else text("select 'not migrated'")
            ).scalar()
        print(f"  Database: Postgres {version}, migration {revision}")
    except Exception as e:
        print(f"  ! Database connection failed: {type(e).__name__}: {e}")
        ok = False

    email, password = os.environ.get("SMOKE_EMAIL"), os.environ.get("SMOKE_PASSWORD")
    if email and password:
        if not s.supabase_publishable_key:
            print("  ! SMOKE_EMAIL set but SUPABASE_PUBLISHABLE_KEY is missing")
            return 1
        resp = httpx.post(
            f"{s.supabase_issuer}/token?grant_type=password",
            headers={"apikey": s.supabase_publishable_key},
            json={"email": email, "password": password},
            timeout=15,
        )
        if resp.status_code != 200:
            print(f"  ! Sign-in failed: {resp.status_code} {resp.text[:200]}")
            return 1
        claims = asyncio.run(get_verifier().verify(resp.json()["access_token"]))
        print(f"  Sign-in: token verified for user {claims.user_id}")

    print("OK" if ok else "FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
