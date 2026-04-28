"""068_ctx_combo_fields

Revision ID: 068_ctx_combo
Revises: 067_src_kind_32
Create Date: 2026-04-23 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "068_ctx_combo"
down_revision = "067_src_kind_32"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "chat_session_snapshot",
        sa.Column("active_source_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "chat_session_snapshot",
        sa.Column("active_combination_id", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "chat_session_snapshot",
        sa.Column("active_combination_name", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "chat_session_event",
        sa.Column("source_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "chat_session_event",
        sa.Column("combination_id", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "chat_session_event",
        sa.Column("combination_name", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("chat_session_event", "combination_name")
    op.drop_column("chat_session_event", "combination_id")
    op.drop_column("chat_session_event", "source_ids")
    op.drop_column("chat_session_snapshot", "active_combination_name")
    op.drop_column("chat_session_snapshot", "active_combination_id")
    op.drop_column("chat_session_snapshot", "active_source_ids")
