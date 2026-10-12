import asyncio

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text
from starlette.concurrency import run_in_threadpool

from app.api.deps import get_redis
from app.db.session import get_async_engine
from app.storage.s3 import get_storage

router = APIRouter(tags=["health"])


async def _check_db() -> None:
    async with get_async_engine().connect() as conn:
        await conn.execute(text("select 1"))


async def _check_redis() -> None:
    await get_redis().ping()


async def _check_storage() -> None:
    await run_in_threadpool(get_storage().ping)


@router.get("/healthz", summary="Liveness, and readiness with ?ready=true")
async def healthz(ready: bool = False) -> JSONResponse:
    if not ready:
        return JSONResponse({"status": "ok"})
    checks = {"database": _check_db, "redis": _check_redis, "storage": _check_storage}
    results: dict[str, str] = {}

    async def run(name: str) -> None:
        try:
            await asyncio.wait_for(checks[name](), timeout=5)
            results[name] = "ok"
        except Exception as e:
            results[name] = f"error: {type(e).__name__}"

    await asyncio.gather(*(run(n) for n in checks))
    healthy = all(v == "ok" for v in results.values())
    return JSONResponse(
        {"status": "ok" if healthy else "degraded", "checks": results}, status_code=200 if healthy else 503
    )
