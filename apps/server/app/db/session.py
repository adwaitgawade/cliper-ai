"""Database engines: async for the API, sync for Celery workers.

Both use psycopg 3. Server-side prepared statements are disabled so the URL can point
at the Supabase pooler in either session mode (port 5432) or transaction mode (6543).
"""

from collections.abc import AsyncIterator, Iterator
from contextlib import contextmanager
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

_CONNECT_ARGS = {"prepare_threshold": None, "application_name": "clippro"}


@lru_cache
def get_async_engine() -> AsyncEngine:
    s = get_settings()
    return create_async_engine(
        s.database_url,
        pool_size=s.db_pool_size,
        max_overflow=s.db_max_overflow,
        pool_pre_ping=True,
        pool_recycle=1800,
        connect_args=_CONNECT_ARGS,
    )


@lru_cache
def get_async_sessionmaker() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(get_async_engine(), expire_on_commit=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with get_async_sessionmaker()() as session:
        yield session


@lru_cache
def get_sync_engine() -> Engine:
    s = get_settings()
    return create_engine(
        s.database_url,
        pool_size=2,
        max_overflow=2,
        pool_pre_ping=True,
        pool_recycle=1800,
        connect_args=_CONNECT_ARGS,
    )


@lru_cache
def _sync_sessionmaker() -> sessionmaker[Session]:
    return sessionmaker(get_sync_engine(), expire_on_commit=False)


@contextmanager
def sync_session() -> Iterator[Session]:
    with _sync_sessionmaker()() as session:
        yield session
