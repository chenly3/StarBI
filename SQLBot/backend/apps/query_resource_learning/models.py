from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Identity,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class QueryResourceLearningTask(SQLModel, table=True):
    __tablename__ = "query_resource_learning_task"

    id: int | None = Field(
        sa_column=Column(
            BigInteger,
            Identity(always=True),
            nullable=False,
            primary_key=True,
        )
    )
    resource_id: str = Field(
        sa_column=Column(String(64), nullable=False, index=True)
    )
    status: str = Field(
        sa_column=Column(String(32), nullable=False, index=True)
    )
    trigger_type: str = Field(
        default="manual",
        sa_column=Column(String(32), nullable=False),
    )
    failure_reason: str | None = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    started_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=False), nullable=True),
    )
    finished_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=False), nullable=True),
    )


class QueryResourceLearningResult(SQLModel, table=True):
    __tablename__ = "query_resource_learning_result"

    id: int | None = Field(
        sa_column=Column(
            BigInteger,
            Identity(always=True),
            nullable=False,
            primary_key=True,
        )
    )
    resource_id: str = Field(
        sa_column=Column(String(64), nullable=False, index=True)
    )
    version: int = Field(
        default=1,
        sa_column=Column(Integer, nullable=False),
    )
    semantic_profile: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSONB(astext_type=Text()), nullable=False),
    )
    sample_values: list[Any] = Field(
        default_factory=list,
        sa_column=Column(JSONB(astext_type=Text()), nullable=False),
    )
    recommended_questions: list[Any] = Field(
        default_factory=list,
        sa_column=Column(JSONB(astext_type=Text()), nullable=False),
    )


class QueryResourceLearningScore(SQLModel, table=True):
    __tablename__ = "query_resource_learning_score"

    id: int | None = Field(
        sa_column=Column(
            BigInteger,
            Identity(always=True),
            nullable=False,
            primary_key=True,
        )
    )
    resource_id: str = Field(
        sa_column=Column(String(64), nullable=False, index=True)
    )
    grade: str = Field(
        default="C",
        sa_column=Column(String(4), nullable=False),
    )
    score: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False),
    )
    signals: list[Any] = Field(
        default_factory=list,
        sa_column=Column(JSONB(astext_type=Text()), nullable=False),
    )


class QueryResourceLearningFeedbackEvent(SQLModel, table=True):
    __tablename__ = "query_resource_learning_feedback_event"
    __table_args__ = (
        Index(
            "uq_query_resource_learning_feedback_event_event_no",
            "event_no",
            unique=True,
        ),
    )

    id: int | None = Field(
        sa_column=Column(
            BigInteger,
            Identity(always=True),
            nullable=False,
            primary_key=True,
        )
    )
    event_no: str = Field(
        sa_column=Column(String(64), nullable=False)
    )
    resource_id: str = Field(
        sa_column=Column(String(64), nullable=False, index=True)
    )
    source_chat_id: int | None = Field(
        default=None,
        sa_column=Column(BigInteger, nullable=True),
    )
    source_chat_record_id: int | None = Field(
        default=None,
        sa_column=Column(BigInteger, nullable=True, index=True),
    )
    source_trace_id: str | None = Field(
        default=None,
        sa_column=Column(String(64), nullable=True, index=True),
    )
    actor_uid: int | None = Field(
        default=None,
        sa_column=Column(BigInteger, nullable=True),
    )
    actor_account: str = Field(
        sa_column=Column(String(128), nullable=False, index=True)
    )
    event_type: str = Field(
        sa_column=Column(String(32), nullable=False, index=True)
    )
    question_text: str | None = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    question_hash: str | None = Field(
        default=None,
        sa_column=Column(String(64), nullable=True, index=True),
    )
    matched_sql: str | None = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    error_code: str | None = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
    )
    error_message: str | None = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    before_snapshot: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSONB(astext_type=Text()), nullable=False),
    )
    after_snapshot: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSONB(astext_type=Text()), nullable=False),
    )
    patch_types: list[Any] = Field(
        default_factory=list,
        sa_column=Column(JSONB(astext_type=Text()), nullable=False),
    )
    visibility: str = Field(
        default="admin_only",
        sa_column=Column(String(16), nullable=False),
    )
    created_at: datetime = Field(
        default_factory=datetime.now,
        sa_column=Column(DateTime(timezone=False), nullable=False, index=True),
    )


class QueryResourceLearningPatchSnapshot(SQLModel, table=True):
    __tablename__ = "query_resource_learning_patch_snapshot"
    __table_args__ = (
        Index(
            "ix_query_resource_learning_patch_snapshot_resource_status",
            "resource_id",
            "status",
        ),
        Index(
            "uq_query_resource_learning_patch_snapshot_active_match",
            "resource_id",
            "patch_type",
            "match_fingerprint",
            unique=True,
            postgresql_where=text("status = 'active'"),
        ),
    )

    id: int | None = Field(
        sa_column=Column(
            BigInteger,
            Identity(always=True),
            nullable=False,
            primary_key=True,
        )
    )
    resource_id: str = Field(
        sa_column=Column(String(64), nullable=False, index=True)
    )
    patch_type: str = Field(
        sa_column=Column(String(32), nullable=False, index=True)
    )
    match_fingerprint: str = Field(
        sa_column=Column(String(128), nullable=False, index=True)
    )
    match_rule: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSONB(astext_type=Text()), nullable=False),
    )
    patch_payload: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSONB(astext_type=Text()), nullable=False),
    )
    priority: int = Field(
        default=100,
        sa_column=Column(Integer, nullable=False),
    )
    status: str = Field(
        default="active",
        sa_column=Column(String(16), nullable=False, index=True),
    )
    source_event_id: int = Field(
        sa_column=Column(BigInteger, nullable=False, index=True)
    )
    enabled_by: str = Field(
        sa_column=Column(String(128), nullable=False)
    )
    disabled_by: str | None = Field(
        default=None,
        sa_column=Column(String(128), nullable=True),
    )
    disable_reason: str | None = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    activated_at: datetime = Field(
        default_factory=datetime.now,
        sa_column=Column(DateTime(timezone=False), nullable=False, index=True),
    )
    deactivated_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=False), nullable=True),
    )
    version: int = Field(
        default=1,
        sa_column=Column(Integer, nullable=False),
    )


class QueryResourceLearningPatchApplyLog(SQLModel, table=True):
    __tablename__ = "query_resource_learning_patch_apply_log"

    id: int | None = Field(
        sa_column=Column(
            BigInteger,
            Identity(always=True),
            nullable=False,
            primary_key=True,
        )
    )
    resource_id: str = Field(
        sa_column=Column(String(64), nullable=False, index=True)
    )
    chat_record_id: int | None = Field(
        default=None,
        sa_column=Column(BigInteger, nullable=True, index=True),
    )
    trace_id: str = Field(
        sa_column=Column(String(64), nullable=False, index=True)
    )
    question_text: str | None = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    question_hash: str | None = Field(
        default=None,
        sa_column=Column(String(64), nullable=True, index=True),
    )
    pre_sql: str | None = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    post_sql: str | None = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    applied_patch_ids: list[Any] = Field(
        default_factory=list,
        sa_column=Column(JSONB(astext_type=Text()), nullable=False),
    )
    apply_result: str = Field(
        sa_column=Column(String(16), nullable=False, index=True)
    )
    error_message: str | None = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    created_at: datetime = Field(
        default_factory=datetime.now,
        sa_column=Column(DateTime(timezone=False), nullable=False, index=True),
    )


class QueryResourceLearningFeedbackMetric(SQLModel, table=True):
    __tablename__ = "query_resource_learning_feedback_metric"
    __table_args__ = (
        Index(
            "ix_query_resource_learning_feedback_metric_relearning_suggested",
            "relearning_suggested",
        ),
        Index(
            "ix_query_resource_learning_feedback_metric_trigger_reason",
            "trigger_reason",
        ),
    )

    resource_id: str = Field(
        sa_column=Column(String(64), nullable=False, primary_key=True)
    )
    lifetime_total_feedback_count: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False),
    )
    lifetime_downvote_count: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False),
    )
    lifetime_failure_count: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False),
    )
    lifetime_correction_count: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False),
    )
    window_7d_total_feedback_count: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False),
    )
    window_7d_downvote_rate: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False),
    )
    window_7d_failure_rate: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False),
    )
    window_7d_correction_rate: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False),
    )
    relearning_suggested: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False),
    )
    trigger_reason: str = Field(
        default="observe",
        sa_column=Column(String(32), nullable=False),
    )
    relearning_advice: str = Field(
        default="当前反馈稳定，建议持续观察。",
        sa_column=Column(Text, nullable=False),
    )
    last_event_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=False), nullable=True),
    )
    updated_at: datetime = Field(
        default_factory=datetime.now,
        sa_column=Column(DateTime(timezone=False), nullable=False, index=True),
    )
