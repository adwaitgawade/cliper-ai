"""clip thumbnail

Revision ID: 4d8a1f6c2b73
Revises: 9b3e7c1d5f20
Create Date: 2026-10-13 18:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "4d8a1f6c2b73"
down_revision: str | None = "9b3e7c1d5f20"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("clips", sa.Column("thumbnail_key", sa.Text(), nullable=True), schema="app")


def downgrade() -> None:
    op.drop_column("clips", "thumbnail_key", schema="app")
