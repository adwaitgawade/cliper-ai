"""job waiting state and ai edits

Revision ID: 7e2c9a4f1b36
Revises: 4d8a1f6c2b73
Create Date: 2026-11-17 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "7e2c9a4f1b36"
down_revision: str | None = "4d8a1f6c2b73"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_OLD_STATES = "'queued', 'ingesting', 'transcribing', 'analyzing', 'reframing', 'rendering', 'completed', 'failed', 'canceled'"
_NEW_STATES = "'waiting', " + _OLD_STATES


def upgrade() -> None:
    op.drop_constraint(op.f("jobs_state_valid_check"), "jobs", schema="app", type_="check")
    op.create_check_constraint(op.f("jobs_state_valid_check"), "jobs", f"state in ({_NEW_STATES})", schema="app")
    # Admission counts a workspace's live jobs and picks its oldest waiting ones.
    op.create_index(
        "jobs_workspace_id_live_idx",
        "jobs",
        ["workspace_id", "created_at"],
        unique=False,
        schema="app",
        postgresql_where=sa.text("state not in ('completed', 'failed', 'canceled')"),
    )

    op.create_table(
        "ai_edits",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("clip_id", sa.UUID(), nullable=False),
        sa.Column("created_by", sa.UUID(), nullable=False),
        sa.Column("instruction", sa.Text(), nullable=False),
        sa.Column("base", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("proposal", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("changes", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("model", sa.Text(), nullable=True),
        sa.Column("cost", sa.Numeric(12, 6), server_default=sa.text("0"), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "status in ('queued', 'running', 'succeeded', 'failed')", name=op.f("ai_edits_status_valid_check")
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"], ["app.workspaces.id"], name=op.f("ai_edits_workspace_id_fkey"), ondelete="cascade"
        ),
        sa.ForeignKeyConstraint(["clip_id"], ["app.clips.id"], name=op.f("ai_edits_clip_id_fkey"), ondelete="cascade"),
        sa.ForeignKeyConstraint(
            ["created_by"], ["app.users.id"], name=op.f("ai_edits_created_by_fkey"), ondelete="cascade"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("ai_edits_pkey")),
        schema="app",
    )
    op.create_index(
        "ai_edits_clip_id_created_at_idx",
        "ai_edits",
        ["clip_id", sa.literal_column("created_at desc")],
        unique=False,
        schema="app",
    )
    op.create_index(op.f("ai_edits_workspace_id_idx"), "ai_edits", ["workspace_id"], unique=False, schema="app")
    op.create_index(op.f("ai_edits_created_by_idx"), "ai_edits", ["created_by"], unique=False, schema="app")
    # Same defense in depth as every other table (see the initial migration).
    op.execute("alter table app.ai_edits enable row level security;")


def downgrade() -> None:
    op.drop_index(op.f("ai_edits_created_by_idx"), table_name="ai_edits", schema="app")
    op.drop_index(op.f("ai_edits_workspace_id_idx"), table_name="ai_edits", schema="app")
    op.drop_index("ai_edits_clip_id_created_at_idx", table_name="ai_edits", schema="app")
    op.drop_table("ai_edits", schema="app")
    op.drop_index("jobs_workspace_id_live_idx", table_name="jobs", schema="app")
    op.execute("update app.jobs set state = 'queued' where state = 'waiting'")
    op.drop_constraint(op.f("jobs_state_valid_check"), "jobs", schema="app", type_="check")
    op.create_check_constraint(op.f("jobs_state_valid_check"), "jobs", f"state in ({_OLD_STATES})", schema="app")
