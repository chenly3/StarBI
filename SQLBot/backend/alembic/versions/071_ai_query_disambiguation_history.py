"""add ai query disambiguation history

Revision ID: 071_disambiguation_history
Revises: 070_qrl_feedback_loop
Create Date: 2026-05-01 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "071_disambiguation_history"
down_revision = "070_qrl_feedback_loop"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_query_disambiguation_history",
        sa.Column(
            "id",
            sa.BigInteger(),
            sa.Identity(always=True),
            nullable=False,
            primary_key=True,
        ),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("org_id", sa.BigInteger(), nullable=True),
        sa.Column("question_pattern", sa.String(length=500), nullable=False),
        sa.Column("resolution", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=False), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=False), nullable=False),
        sa.Column("use_count", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("source", sa.String(length=64), nullable=True),
        sa.Column("context", sa.Text(), nullable=True),
    )
    op.create_index(
        "ix_ai_query_disambiguation_history_user_id",
        "ai_query_disambiguation_history",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_ai_query_disambiguation_history_org_id",
        "ai_query_disambiguation_history",
        ["org_id"],
        unique=False,
    )
    op.create_index(
        "ix_ai_query_disambiguation_history_question_pattern",
        "ai_query_disambiguation_history",
        ["question_pattern"],
        unique=False,
    )
    op.create_index(
        "ix_ai_query_disambiguation_history_user_pattern",
        "ai_query_disambiguation_history",
        ["user_id", "question_pattern"],
        unique=True,
    )
    op.create_index(
        "ix_ai_query_disambiguation_history_last_used_at",
        "ai_query_disambiguation_history",
        ["last_used_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_ai_query_disambiguation_history_last_used_at",
        table_name="ai_query_disambiguation_history",
    )
    op.drop_index(
        "ix_ai_query_disambiguation_history_user_pattern",
        table_name="ai_query_disambiguation_history",
    )
    op.drop_index(
        "ix_ai_query_disambiguation_history_question_pattern",
        table_name="ai_query_disambiguation_history",
    )
    op.drop_index(
        "ix_ai_query_disambiguation_history_org_id",
        table_name="ai_query_disambiguation_history",
    )
    op.drop_index(
        "ix_ai_query_disambiguation_history_user_id",
        table_name="ai_query_disambiguation_history",
    )
    op.drop_table("ai_query_disambiguation_history")
