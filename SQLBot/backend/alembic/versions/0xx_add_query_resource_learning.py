"""add query resource learning tables

Revision ID: 069_query_resource_learning
Revises: 068_ctx_combo
Create Date: 2026-04-24 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "069_query_resource_learning"
down_revision = "068_ctx_combo"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "query_resource_learning_task",
        sa.Column(
            "id",
            sa.BigInteger(),
            sa.Identity(always=True),
            nullable=False,
            primary_key=True,
        ),
        sa.Column("resource_id", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column(
            "trigger_type",
            sa.String(length=32),
            nullable=False,
            server_default=sa.text("'manual'"),
        ),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=False), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=False), nullable=True),
    )
    op.create_index(
        "ix_query_resource_learning_task_resource_id",
        "query_resource_learning_task",
        ["resource_id"],
        unique=False,
    )
    op.create_index(
        "ix_query_resource_learning_task_status",
        "query_resource_learning_task",
        ["status"],
        unique=False,
    )

    op.create_table(
        "query_resource_learning_result",
        sa.Column(
            "id",
            sa.BigInteger(),
            sa.Identity(always=True),
            nullable=False,
            primary_key=True,
        ),
        sa.Column("resource_id", sa.String(length=64), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column(
            "semantic_profile",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "sample_values",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "recommended_questions",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.create_index(
        "ix_query_resource_learning_result_resource_id",
        "query_resource_learning_result",
        ["resource_id"],
        unique=False,
    )

    op.create_table(
        "query_resource_learning_score",
        sa.Column(
            "id",
            sa.BigInteger(),
            sa.Identity(always=True),
            nullable=False,
            primary_key=True,
        ),
        sa.Column("resource_id", sa.String(length=64), nullable=False),
        sa.Column(
            "grade",
            sa.String(length=4),
            nullable=False,
            server_default=sa.text("'C'"),
        ),
        sa.Column("score", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "signals",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.create_index(
        "ix_query_resource_learning_score_resource_id",
        "query_resource_learning_score",
        ["resource_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_query_resource_learning_score_resource_id",
        table_name="query_resource_learning_score",
    )
    op.drop_table("query_resource_learning_score")

    op.drop_index(
        "ix_query_resource_learning_result_resource_id",
        table_name="query_resource_learning_result",
    )
    op.drop_table("query_resource_learning_result")

    op.drop_index(
        "ix_query_resource_learning_task_status",
        table_name="query_resource_learning_task",
    )
    op.drop_index(
        "ix_query_resource_learning_task_resource_id",
        table_name="query_resource_learning_task",
    )
    op.drop_table("query_resource_learning_task")
