from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool, text

from app.core.config import get_settings
from app.db.models import SCHEMA, Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def include_name(name: str | None, type_: str, parent_names: dict) -> bool:
    # Only manage our own schema; never touch Supabase-owned schemas (auth, storage, ...).
    if type_ == "schema":
        return name == SCHEMA
    return True


def include_object(obj, name, type_, reflected, compare_to) -> bool:
    # Foreign keys into Supabase schemas (e.g. app.users -> auth.users) are managed in
    # migrations by hand, since the auth schema is not part of our metadata.
    return not (type_ == "foreign_key_constraint" and reflected and obj.referred_table.schema != SCHEMA)


def _configure(**kwargs) -> None:
    context.configure(
        target_metadata=target_metadata,
        version_table_schema=SCHEMA,
        include_schemas=True,
        include_name=include_name,
        include_object=include_object,
        compare_type=True,
        **kwargs,
    )


def run_migrations_offline() -> None:
    _configure(url=get_settings().database_url, literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    url = config.attributes.get("database_url") or get_settings().database_url
    engine = create_engine(url, poolclass=pool.NullPool, connect_args={"prepare_threshold": None})
    with engine.connect() as connection:
        connection.execute(text(f"create schema if not exists {SCHEMA}"))
        connection.commit()
        _configure(connection=connection)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
