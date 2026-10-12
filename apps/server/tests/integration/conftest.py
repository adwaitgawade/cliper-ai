"""Integration fixtures: a migrated local Postgres, moto S3, signed Supabase-style JWTs."""

import time
import uuid
from collections.abc import AsyncIterator, Iterator
from dataclasses import dataclass, field
from pathlib import Path

import jwt
import psycopg
import pytest
from alembic import command
from alembic.config import Config
from cryptography.hazmat.primitives.asymmetric import ec
from httpx import ASGITransport, AsyncClient
from moto import mock_aws
from sqlalchemy.engine import make_url

from app.core.config import get_settings

SERVER_DIR = Path(__file__).resolve().parents[2]


def _admin_conninfo() -> tuple[str, str]:
    url = make_url(get_settings().database_url)
    host = url.query.get("host") or url.host or "/tmp"
    params = f"host={host} dbname=postgres"
    if url.username:
        params += f" user={url.username}"
    if url.password:
        params += f" password={url.password}"
    if url.port:
        params += f" port={url.port}"
    return params, str(url.database)


@pytest.fixture(scope="session")
def database() -> Iterator[None]:
    admin, name = _admin_conninfo()
    try:
        conn = psycopg.connect(admin, autocommit=True)
    except psycopg.OperationalError as e:
        pytest.skip(f"local Postgres not available: {e}")
    with conn:
        conn.execute(f'drop database if exists "{name}" with (force)')
        conn.execute(f'create database "{name}"')
    with psycopg.connect(admin.replace("dbname=postgres", f"dbname={name}"), autocommit=True) as db:
        db.execute((SERVER_DIR / "scripts" / "local_supabase_stub.sql").read_text())
    cfg = Config(str(SERVER_DIR / "alembic.ini"))
    cfg.attributes["database_url"] = get_settings().database_url
    command.upgrade(cfg, "head")
    yield


@pytest.fixture(scope="session")
def s3() -> Iterator[None]:
    with mock_aws():
        from app.storage.s3 import get_storage

        get_storage.cache_clear()
        get_storage().ensure_bucket()
        yield


class FakeRedis:
    def __init__(self) -> None:
        self.data: dict[str, int] = {}

    async def incr(self, key: str) -> int:
        self.data[key] = self.data.get(key, 0) + 1
        return self.data[key]

    async def expire(self, key: str, seconds: int) -> None:
        return None

    async def ping(self) -> bool:
        return True


@dataclass
class Recorder:
    pipelines: list[tuple[uuid.UUID, int]] = field(default_factory=list)
    renders: list[tuple[uuid.UUID, uuid.UUID]] = field(default_factory=list)
    purged: list[str] = field(default_factory=list)
    fail: bool = False

    def enqueue_pipeline(self, job_id: uuid.UUID, attempt: int) -> None:
        if self.fail:
            raise ConnectionError("broker down")
        self.pipelines.append((job_id, attempt))

    def enqueue_render(self, clip_id: uuid.UUID, render_id: uuid.UUID) -> None:
        self.renders.append((clip_id, render_id))

    def purge_prefixes(self, prefixes: list[str]) -> None:
        self.purged.extend(prefixes)


class Users:
    """Creates Supabase-like users (auth.users rows) and signs access tokens for them."""

    def __init__(self) -> None:
        self.key = ec.generate_private_key(ec.SECP256R1())
        self.jwk = jwt.PyJWK.from_dict(
            {**jwt.algorithms.ECAlgorithm.to_jwk(self.key.public_key(), as_dict=True), "kid": "test", "alg": "ES256"}
        )

    def create(self, email: str | None = None) -> tuple[uuid.UUID, str]:
        user_id = uuid.uuid4()
        email = email or f"{user_id.hex[:8]}@example.com"
        admin, name = _admin_conninfo()
        with psycopg.connect(admin.replace("dbname=postgres", f"dbname={name}"), autocommit=True) as db:
            db.execute("insert into auth.users (id, email) values (%s, %s)", (user_id, email))
        return user_id, email

    def token(self, user_id: uuid.UUID, email: str, **extra: object) -> str:
        now = int(time.time())
        claims = {
            "sub": str(user_id),
            "email": email,
            "role": "authenticated",
            "aud": "authenticated",
            "iss": get_settings().supabase_issuer,
            "iat": now,
            "exp": now + 3600,
            **extra,
        }
        return jwt.encode(claims, self.key, algorithm="ES256", headers={"kid": "test"})

    def headers(self, email: str | None = None) -> dict[str, str]:
        uid, mail = self.create(email)
        return {"Authorization": f"Bearer {self.token(uid, mail)}"}


@pytest.fixture(scope="session")
def users(database: None) -> Users:
    return Users()


@pytest.fixture
def recorder() -> Recorder:
    return Recorder()


@pytest.fixture
async def client(database: None, s3: None, users: Users, recorder: Recorder, monkeypatch) -> AsyncIterator[AsyncClient]:
    from app.api import auth, deps
    from app.api.dispatch import get_dispatcher
    from app.main import app

    verifier = auth.get_verifier()
    monkeypatch.setattr(verifier.jwks, "get_signing_key_from_jwt", lambda token: users.jwk)
    fake_redis = FakeRedis()
    monkeypatch.setattr(deps, "get_redis", lambda: fake_redis)
    app.dependency_overrides[get_dispatcher] = lambda: recorder
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def eager_celery():
    """Run Celery tasks (chains, chords) synchronously in-process."""
    from app.workers.celery_app import celery_app

    keys = ("task_always_eager", "task_eager_propagates", "result_backend", "broker_url")
    old = {k: celery_app.conf[k] for k in keys}
    celery_app.conf.update(
        task_always_eager=True, task_eager_propagates=True, result_backend="cache+memory://", broker_url="memory://"
    )
    yield celery_app
    celery_app.conf.update(old)
