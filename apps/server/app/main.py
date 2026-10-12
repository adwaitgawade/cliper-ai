"""FastAPI application factory."""

import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import accounts, clips, health, jobs, styles, videos
from app.core.config import get_settings
from app.core.errors import install_error_handlers
from app.core.logging import configure_logging
from app.db.session import get_async_engine
from app.schemas.common import ErrorResponse

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    yield
    await get_async_engine().dispose()


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level, settings.log_json)

    app = FastAPI(
        title="ClipPro API",
        version="0.1.0",
        description=(
            "Turn long-form videos into ranked, captioned 9:16 clips.\n\n"
            "Authenticate with a Supabase access token (`Authorization: Bearer <jwt>`) from an email/password "
            "sign-in, or a workspace API key (`X-API-Key: cp_...`). Select a team workspace with `X-Workspace-Id`."
        ),
        lifespan=lifespan,
        responses={
            401: {"model": ErrorResponse},
            403: {"model": ErrorResponse},
            404: {"model": ErrorResponse},
            422: {"model": ErrorResponse},
            429: {"model": ErrorResponse},
        },
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    @app.middleware("http")
    async def request_context(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
        request.state.request_id = request_id
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    install_error_handlers(app)
    app.include_router(health.router)
    app.include_router(accounts.router)
    app.include_router(videos.router)
    app.include_router(jobs.router)
    app.include_router(clips.router)
    app.include_router(styles.router)
    return app


app = create_app()
