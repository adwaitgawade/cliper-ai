"""video title and thumbnail

Revision ID: 9b3e7c1d5f20
Revises: 6c1d2f8e9a47
Create Date: 2026-10-13 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "9b3e7c1d5f20"
down_revision: str | None = "6c1d2f8e9a47"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("videos", sa.Column("title", sa.Text(), nullable=True), schema="app")
    op.add_column("videos", sa.Column("thumbnail_key", sa.Text(), nullable=True), schema="app")


def downgrade() -> None:
    op.drop_column("videos", "thumbnail_key", schema="app")
    op.drop_column("videos", "title", schema="app")
