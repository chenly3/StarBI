"""067_expand_sqlbot_new_source_kind_columns

Revision ID: 067_src_kind_32
Revises: 5ec3cb0b612a
Create Date: 2026-04-23 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "067_src_kind_32"
down_revision = "5ec3cb0b612a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "chat_session_snapshot",
        "active_source_kind",
        existing_type=sa.String(length=16),
        type_=sa.String(length=32),
        existing_nullable=False,
    )
    op.alter_column(
        "chat_session_event",
        "source_kind",
        existing_type=sa.String(length=16),
        type_=sa.String(length=32),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "chat_session_event",
        "source_kind",
        existing_type=sa.String(length=32),
        type_=sa.String(length=16),
        existing_nullable=True,
    )
    op.alter_column(
        "chat_session_snapshot",
        "active_source_kind",
        existing_type=sa.String(length=32),
        type_=sa.String(length=16),
        existing_nullable=False,
    )
