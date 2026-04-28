"""add query resource learning feedback loop tables

Revision ID: 070_qrl_feedback_loop
Revises: 069_query_resource_learning
Create Date: 2026-04-28 00:00:00.000000

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "070_qrl_feedback_loop"
down_revision = "069_query_resource_learning"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "query_resource_learning_feedback_event",
        sa.Column(
            "id",
            sa.BigInteger(),
            sa.Identity(always=True),
            nullable=False,
            primary_key=True,
        ),
        sa.Column("event_no", sa.String(length=64), nullable=False),
        sa.Column("resource_id", sa.String(length=64), nullable=False),
        sa.Column("source_chat_id", sa.BigInteger(), nullable=True),
        sa.Column("source_chat_record_id", sa.BigInteger(), nullable=True),
        sa.Column("source_trace_id", sa.String(length=64), nullable=True),
        sa.Column("actor_uid", sa.BigInteger(), nullable=True),
        sa.Column("actor_account", sa.String(length=128), nullable=False),
        sa.Column("event_type", sa.String(length=32), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=True),
        sa.Column("question_hash", sa.String(length=64), nullable=True),
        sa.Column("matched_sql", sa.Text(), nullable=True),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "before_snapshot",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "after_snapshot",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "patch_types",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "visibility",
            sa.String(length=16),
            nullable=False,
            server_default=sa.text("'admin_only'"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=False), nullable=False),
    )
    op.create_index(
        "uq_query_resource_learning_feedback_event_event_no",
        "query_resource_learning_feedback_event",
        ["event_no"],
        unique=True,
    )
    op.create_index(
        "ix_query_resource_learning_feedback_event_resource_id",
        "query_resource_learning_feedback_event",
        ["resource_id"],
        unique=False,
    )
    op.create_index(
        "ix_query_resource_learning_feedback_event_source_chat_record_id",
        "query_resource_learning_feedback_event",
        ["source_chat_record_id"],
        unique=False,
    )
    op.create_index(
        "ix_query_resource_learning_feedback_event_source_trace_id",
        "query_resource_learning_feedback_event",
        ["source_trace_id"],
        unique=False,
    )
    op.create_index(
        "ix_query_resource_learning_feedback_event_actor_account",
        "query_resource_learning_feedback_event",
        ["actor_account"],
        unique=False,
    )
    op.create_index(
        "ix_query_resource_learning_feedback_event_event_type",
        "query_resource_learning_feedback_event",
        ["event_type"],
        unique=False,
    )
    op.create_index(
        "ix_query_resource_learning_feedback_event_question_hash",
        "query_resource_learning_feedback_event",
        ["question_hash"],
        unique=False,
    )
    op.create_index(
        "ix_query_resource_learning_feedback_event_created_at",
        "query_resource_learning_feedback_event",
        ["created_at"],
        unique=False,
    )

    op.create_table(
        "query_resource_learning_patch_snapshot",
        sa.Column(
            "id",
            sa.BigInteger(),
            sa.Identity(always=True),
            nullable=False,
            primary_key=True,
        ),
        sa.Column("resource_id", sa.String(length=64), nullable=False),
        sa.Column("patch_type", sa.String(length=32), nullable=False),
        sa.Column("match_fingerprint", sa.String(length=128), nullable=False),
        sa.Column(
            "match_rule",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "patch_payload",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "priority",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("100"),
        ),
        sa.Column(
            "status",
            sa.String(length=16),
            nullable=False,
            server_default=sa.text("'active'"),
        ),
        sa.Column("source_event_id", sa.BigInteger(), nullable=False),
        sa.Column("enabled_by", sa.String(length=128), nullable=False),
        sa.Column("disabled_by", sa.String(length=128), nullable=True),
        sa.Column("disable_reason", sa.Text(), nullable=True),
        sa.Column("activated_at", sa.DateTime(timezone=False), nullable=False),
        sa.Column("deactivated_at", sa.DateTime(timezone=False), nullable=True),
        sa.Column(
            "version",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("1"),
        ),
    )
    op.create_index(
        "ix_query_resource_learning_patch_snapshot_resource_id",
        "query_resource_learning_patch_snapshot",
        ["resource_id"],
        unique=False,
    )
    op.create_index(
        "ix_query_resource_learning_patch_snapshot_patch_type",
        "query_resource_learning_patch_snapshot",
        ["patch_type"],
        unique=False,
    )
    op.create_index(
        "ix_query_resource_learning_patch_snapshot_match_fingerprint",
        "query_resource_learning_patch_snapshot",
        ["match_fingerprint"],
        unique=False,
    )
    op.create_index(
        "ix_query_resource_learning_patch_snapshot_status",
        "query_resource_learning_patch_snapshot",
        ["status"],
        unique=False,
    )
    op.create_index(
        "ix_query_resource_learning_patch_snapshot_source_event_id",
        "query_resource_learning_patch_snapshot",
        ["source_event_id"],
        unique=False,
    )
    op.create_index(
        "ix_query_resource_learning_patch_snapshot_activated_at",
        "query_resource_learning_patch_snapshot",
        ["activated_at"],
        unique=False,
    )
    op.create_index(
        "ix_query_resource_learning_patch_snapshot_resource_status",
        "query_resource_learning_patch_snapshot",
        ["resource_id", "status"],
        unique=False,
    )
    op.create_index(
        "uq_query_resource_learning_patch_snapshot_active_match",
        "query_resource_learning_patch_snapshot",
        ["resource_id", "patch_type", "match_fingerprint"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )

    op.create_table(
        "query_resource_learning_patch_apply_log",
        sa.Column(
            "id",
            sa.BigInteger(),
            sa.Identity(always=True),
            nullable=False,
            primary_key=True,
        ),
        sa.Column("resource_id", sa.String(length=64), nullable=False),
        sa.Column("chat_record_id", sa.BigInteger(), nullable=True),
        sa.Column("trace_id", sa.String(length=64), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=True),
        sa.Column("question_hash", sa.String(length=64), nullable=True),
        sa.Column("pre_sql", sa.Text(), nullable=True),
        sa.Column("post_sql", sa.Text(), nullable=True),
        sa.Column(
            "applied_patch_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("apply_result", sa.String(length=16), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=False), nullable=False),
    )
    op.create_index(
        "ix_query_resource_learning_patch_apply_log_resource_id",
        "query_resource_learning_patch_apply_log",
        ["resource_id"],
        unique=False,
    )
    op.create_index(
        "ix_query_resource_learning_patch_apply_log_chat_record_id",
        "query_resource_learning_patch_apply_log",
        ["chat_record_id"],
        unique=False,
    )
    op.create_index(
        "ix_query_resource_learning_patch_apply_log_trace_id",
        "query_resource_learning_patch_apply_log",
        ["trace_id"],
        unique=False,
    )
    op.create_index(
        "ix_query_resource_learning_patch_apply_log_question_hash",
        "query_resource_learning_patch_apply_log",
        ["question_hash"],
        unique=False,
    )
    op.create_index(
        "ix_query_resource_learning_patch_apply_log_apply_result",
        "query_resource_learning_patch_apply_log",
        ["apply_result"],
        unique=False,
    )
    op.create_index(
        "ix_query_resource_learning_patch_apply_log_created_at",
        "query_resource_learning_patch_apply_log",
        ["created_at"],
        unique=False,
    )

    op.create_table(
        "query_resource_learning_feedback_metric",
        sa.Column("resource_id", sa.String(length=64), nullable=False, primary_key=True),
        sa.Column(
            "lifetime_total_feedback_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "lifetime_downvote_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "lifetime_failure_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "lifetime_correction_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "window_7d_total_feedback_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "window_7d_downvote_rate",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "window_7d_failure_rate",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "window_7d_correction_rate",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "relearning_suggested",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            "trigger_reason",
            sa.String(length=32),
            nullable=False,
            server_default=sa.text("'observe'"),
        ),
        sa.Column(
            "relearning_advice",
            sa.Text(),
            nullable=False,
            server_default=sa.text("'当前反馈稳定，建议持续观察。'"),
        ),
        sa.Column("last_event_at", sa.DateTime(timezone=False), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=False), nullable=False),
    )
    op.create_index(
        "ix_query_resource_learning_feedback_metric_relearning_suggested",
        "query_resource_learning_feedback_metric",
        ["relearning_suggested"],
        unique=False,
    )
    op.create_index(
        "ix_query_resource_learning_feedback_metric_trigger_reason",
        "query_resource_learning_feedback_metric",
        ["trigger_reason"],
        unique=False,
    )
    op.create_index(
        "ix_query_resource_learning_feedback_metric_updated_at",
        "query_resource_learning_feedback_metric",
        ["updated_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_query_resource_learning_feedback_metric_updated_at",
        table_name="query_resource_learning_feedback_metric",
    )
    op.drop_index(
        "ix_query_resource_learning_feedback_metric_trigger_reason",
        table_name="query_resource_learning_feedback_metric",
    )
    op.drop_index(
        "ix_query_resource_learning_feedback_metric_relearning_suggested",
        table_name="query_resource_learning_feedback_metric",
    )
    op.drop_table("query_resource_learning_feedback_metric")

    op.drop_index(
        "ix_query_resource_learning_patch_apply_log_created_at",
        table_name="query_resource_learning_patch_apply_log",
    )
    op.drop_index(
        "ix_query_resource_learning_patch_apply_log_apply_result",
        table_name="query_resource_learning_patch_apply_log",
    )
    op.drop_index(
        "ix_query_resource_learning_patch_apply_log_question_hash",
        table_name="query_resource_learning_patch_apply_log",
    )
    op.drop_index(
        "ix_query_resource_learning_patch_apply_log_trace_id",
        table_name="query_resource_learning_patch_apply_log",
    )
    op.drop_index(
        "ix_query_resource_learning_patch_apply_log_chat_record_id",
        table_name="query_resource_learning_patch_apply_log",
    )
    op.drop_index(
        "ix_query_resource_learning_patch_apply_log_resource_id",
        table_name="query_resource_learning_patch_apply_log",
    )
    op.drop_table("query_resource_learning_patch_apply_log")

    op.drop_index(
        "uq_query_resource_learning_patch_snapshot_active_match",
        table_name="query_resource_learning_patch_snapshot",
    )
    op.drop_index(
        "ix_query_resource_learning_patch_snapshot_resource_status",
        table_name="query_resource_learning_patch_snapshot",
    )
    op.drop_index(
        "ix_query_resource_learning_patch_snapshot_activated_at",
        table_name="query_resource_learning_patch_snapshot",
    )
    op.drop_index(
        "ix_query_resource_learning_patch_snapshot_source_event_id",
        table_name="query_resource_learning_patch_snapshot",
    )
    op.drop_index(
        "ix_query_resource_learning_patch_snapshot_status",
        table_name="query_resource_learning_patch_snapshot",
    )
    op.drop_index(
        "ix_query_resource_learning_patch_snapshot_match_fingerprint",
        table_name="query_resource_learning_patch_snapshot",
    )
    op.drop_index(
        "ix_query_resource_learning_patch_snapshot_patch_type",
        table_name="query_resource_learning_patch_snapshot",
    )
    op.drop_index(
        "ix_query_resource_learning_patch_snapshot_resource_id",
        table_name="query_resource_learning_patch_snapshot",
    )
    op.drop_table("query_resource_learning_patch_snapshot")

    op.drop_index(
        "ix_query_resource_learning_feedback_event_created_at",
        table_name="query_resource_learning_feedback_event",
    )
    op.drop_index(
        "ix_query_resource_learning_feedback_event_question_hash",
        table_name="query_resource_learning_feedback_event",
    )
    op.drop_index(
        "ix_query_resource_learning_feedback_event_event_type",
        table_name="query_resource_learning_feedback_event",
    )
    op.drop_index(
        "ix_query_resource_learning_feedback_event_actor_account",
        table_name="query_resource_learning_feedback_event",
    )
    op.drop_index(
        "ix_query_resource_learning_feedback_event_source_trace_id",
        table_name="query_resource_learning_feedback_event",
    )
    op.drop_index(
        "ix_query_resource_learning_feedback_event_source_chat_record_id",
        table_name="query_resource_learning_feedback_event",
    )
    op.drop_index(
        "ix_query_resource_learning_feedback_event_resource_id",
        table_name="query_resource_learning_feedback_event",
    )
    op.drop_index(
        "uq_query_resource_learning_feedback_event_event_no",
        table_name="query_resource_learning_feedback_event",
    )
    op.drop_table("query_resource_learning_feedback_event")
