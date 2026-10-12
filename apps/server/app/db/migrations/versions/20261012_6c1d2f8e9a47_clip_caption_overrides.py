"""clip caption overrides

Revision ID: 6c1d2f8e9a47
Revises: 0a5e92504b35
Create Date: 2026-10-12 18:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "6c1d2f8e9a47"
down_revision: str | None = "0a5e92504b35"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "clips",
        sa.Column(
            "caption_overrides",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        schema="app",
    )


def downgrade() -> None:
    op.drop_column("clips", "caption_overrides", schema="app")
