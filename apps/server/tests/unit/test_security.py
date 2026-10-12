import time
import uuid

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec

from app.api.auth import SupabaseJWTVerifier, api_key_matches, generate_api_key, parse_api_key
from app.core.config import Settings
from app.core.errors import Unauthorized
from app.core.ids import uuid7
from app.core.net import UnsafeUrl, assert_public_url
from app.workers.webhooks import sign

ISSUER = "https://testproject.supabase.co/auth/v1"


class FakeJwks:
    def __init__(self, public_key, kid="k1"):
        self.jwk = jwt.PyJWK.from_dict(
            {**jwt.algorithms.ECAlgorithm.to_jwk(public_key, as_dict=True), "kid": kid, "alg": "ES256"}
        )

    def get_signing_key_from_jwt(self, token):
        return self.jwk


@pytest.fixture
def keypair():
    return ec.generate_private_key(ec.SECP256R1())


@pytest.fixture
def verifier(keypair):
    v = SupabaseJWTVerifier(Settings(supabase_url="https://testproject.supabase.co"))
    v.jwks = FakeJwks(keypair.public_key())  # type: ignore[assignment]
    return v


def token(key, **overrides):
    now = int(time.time())
    claims = {
        "sub": str(uuid.uuid4()),
        "email": "a@b.co",
        "role": "authenticated",
        "aud": "authenticated",
        "iss": ISSUER,
        "iat": now,
        "exp": now + 3600,
        "session_id": "s1",
        "is_anonymous": False,
    }
    claims.update(overrides)
    claims = {k: v for k, v in claims.items() if v is not None}
    return jwt.encode(claims, key, algorithm="ES256", headers={"kid": "k1"})


async def test_valid_token(verifier, keypair):
    sub = str(uuid.uuid4())
    claims = await verifier.verify(token(keypair, sub=sub))
    assert str(claims.user_id) == sub and claims.email == "a@b.co" and claims.session_id == "s1"


@pytest.mark.parametrize(
    "overrides,code",
    [
        ({"exp": int(time.time()) - 120}, "token_expired"),
        ({"aud": "other"}, "invalid_token"),
        ({"iss": "https://evil.supabase.co/auth/v1"}, "invalid_token"),
        ({"role": "anon"}, "invalid_token"),
        ({"is_anonymous": True}, "invalid_token"),
        ({"sub": "not-a-uuid"}, "invalid_token"),
    ],
)
async def test_rejected_tokens(verifier, keypair, overrides, code):
    with pytest.raises(Unauthorized) as exc:
        await verifier.verify(token(keypair, **overrides))
    assert exc.value.code == code


async def test_wrong_signing_key_rejected(verifier):
    other = ec.generate_private_key(ec.SECP256R1())
    with pytest.raises(Unauthorized):
        await verifier.verify(token(other))


async def test_hs256_without_publishable_key_rejected(verifier):
    hs = jwt.encode({"sub": str(uuid.uuid4()), "role": "authenticated"}, "secret" * 6, algorithm="HS256")
    with pytest.raises(Unauthorized):
        await verifier.verify(hs)


async def test_alg_none_rejected(verifier):
    unsigned = jwt.encode({"sub": str(uuid.uuid4())}, None, algorithm="none")
    with pytest.raises(Unauthorized):
        await verifier.verify(unsigned)


def test_api_key_roundtrip():
    g = generate_api_key()
    assert g.key.startswith("cp_") and parse_api_key(g.key) == g.prefix
    assert api_key_matches(g.key, g.key_hash)
    assert not api_key_matches(g.key + "x", g.key_hash)
    assert parse_api_key("cp_short_x") is None and parse_api_key("eyJhbGciOi") is None


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1/x",
        "http://localhost:8000",
        "http://10.0.0.5/",
        "http://169.254.169.254/latest/meta-data",
        "http://[::1]/",
        "http://[::ffff:127.0.0.1]/",
        "file:///etc/passwd",
        "ftp://example.com/a",
        "http://user:pw@1.1.1.1/",
    ],
)
def test_ssrf_guard_blocks(url):
    with pytest.raises(UnsafeUrl):
        assert_public_url(url)


def test_ssrf_guard_allows_public_ip_and_domain_allowlist():
    assert assert_public_url("https://1.1.1.1/video") == "1.1.1.1"
    with pytest.raises(UnsafeUrl):
        assert_public_url("https://1.1.1.1/video", allowed_domains=["youtube.com"])


def test_uuid7_is_versioned_and_time_ordered():
    a = uuid7()
    time.sleep(0.002)
    b = uuid7()
    assert a.version == 7 and a.variant == uuid.RFC_4122
    assert a < b


def test_database_url_password_placeholder():
    s = Settings(
        database_url="postgresql://postgres.ref:[YOUR-PASSWORD]@host:5432/postgres", database_password="p@ss/word"
    )
    assert s.database_url == "postgresql+psycopg://postgres.ref:p%40ss%2Fword@host:5432/postgres"
    with pytest.raises(ValueError):
        Settings(database_url="postgresql://u:[YOUR-PASSWORD]@h/db", database_password=None)


def test_webhook_signature_is_stable():
    assert sign("s", "1", b"{}") == sign("s", "1", b"{}") != sign("s", "2", b"{}")
