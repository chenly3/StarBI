from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class LearningTaskStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class LearningQualityGrade(StrEnum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"


class QueryResourceLearningResource(BaseModel):
    resource_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    learning_status: LearningTaskStatus
    quality_grade: LearningQualityGrade
    quality_score: int = Field(ge=0)
    last_learning_time: str | None = None
    failure_reason: str | None = None


class QueryResourceLearningTaskResponse(BaseModel):
    task_id: int = Field(gt=0)
    resource_id: str = Field(min_length=1)
    task_status: LearningTaskStatus


class QueryResourceLearningDeleteResponse(BaseModel):
    resource_id: str = Field(min_length=1)
    deleted: bool
    deleted_rows: int = Field(ge=0)


class QueryResourceLearningFeedbackRequest(BaseModel):
    failure_rate: int = Field(ge=0, le=100)
    downvote_rate: int = Field(ge=0, le=100)
    schema_changed: bool = Field(default=False)


class QueryResourceLearningFeedbackResponse(BaseModel):
    resource_id: str = Field(min_length=1)
    accepted: bool
    relearning_suggested: bool
    trigger_reason: str = Field(min_length=1)
    relearning_advice: str = Field(min_length=1)


class QueryResourceLearningQualitySummary(BaseModel):
    resource_id: str = Field(min_length=1)
    score: int = Field(ge=0)
    grade: LearningQualityGrade
    risks: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    signals: list[str] = Field(default_factory=list)


class QueryResourceLearningFeedbackSummary(BaseModel):
    resource_id: str = Field(min_length=1)
    total_feedback_count: int = Field(default=0, ge=0)
    downvote_count: int = Field(default=0, ge=0)
    downvote_rate: int = Field(default=0, ge=0, le=100)
    failure_count: int = Field(default=0, ge=0)
    failure_rate: int = Field(default=0, ge=0, le=100)
    recent_issues: list[str] = Field(default_factory=list)
    relearning_suggested: bool = False
    trigger_reason: str = Field(default="observe", min_length=1)
    relearning_advice: str = Field(default="当前反馈稳定，建议持续观察。", min_length=1)


class QueryResourceLearningFeedbackEventType(StrEnum):
    UPVOTE = "upvote"
    DOWNVOTE = "downvote"
    EXECUTION_FAILURE = "execution_failure"
    MANUAL_FIX_SUBMIT = "manual_fix_submit"
    MANUAL_FIX_DISABLE = "manual_fix_disable"


class QueryResourceLearningPatchType(StrEnum):
    SQL_OVERRIDE = "sql_override"
    FIELD_MAPPING_FIX = "field_mapping_fix"
    VALUE_MAPPING_FIX = "value_mapping_fix"


class QueryResourceLearningFeedbackVisibility(StrEnum):
    ADMIN_ONLY = "admin_only"
    PUBLIC = "public"


class QueryResourceLearningFeedbackEventRequest(BaseModel):
    event_type: QueryResourceLearningFeedbackEventType
    source_chat_id: int | None = Field(default=None)
    source_chat_record_id: int | None = Field(default=None)
    source_trace_id: str | None = Field(default=None)
    question_text: str | None = Field(default=None)
    matched_sql: str | None = Field(default=None)
    error_code: str | None = Field(default=None)
    error_message: str | None = Field(default=None)
    before_snapshot: dict = Field(default_factory=dict)
    after_snapshot: dict = Field(default_factory=dict)
    patch_types: list[QueryResourceLearningPatchType] = Field(default_factory=list)
    visibility: QueryResourceLearningFeedbackVisibility = Field(
        default=QueryResourceLearningFeedbackVisibility.ADMIN_ONLY
    )


class QueryResourceLearningFeedbackEventCreateRequest(QueryResourceLearningFeedbackEventRequest):
    actor_account: str = Field(default="system", min_length=1)


class QueryResourceLearningFeedbackMetricResponse(BaseModel):
    lifetime_total_feedback_count: int = Field(default=0, ge=0)
    lifetime_downvote_count: int = Field(default=0, ge=0)
    lifetime_failure_count: int = Field(default=0, ge=0)
    lifetime_correction_count: int = Field(default=0, ge=0)
    window_7d_total_feedback_count: int = Field(default=0, ge=0)
    window_7d_downvote_rate: int = Field(default=0, ge=0, le=100)
    window_7d_failure_rate: int = Field(default=0, ge=0, le=100)
    window_7d_correction_rate: int = Field(default=0, ge=0, le=100)
    relearning_suggested: bool = False
    trigger_reason: str = Field(default="observe", min_length=1)
    relearning_advice: str = Field(default="当前反馈稳定，建议持续观察。", min_length=1)


class QueryResourceLearningFeedbackEventResponse(BaseModel):
    accepted: bool
    event_no: str = Field(min_length=1)
    resource_id: str = Field(min_length=1)
    active_patch_count: int = Field(default=0, ge=0)
    metric: QueryResourceLearningFeedbackMetricResponse


class QueryResourceLearningFeedbackEventItem(BaseModel):
    event_no: str = Field(min_length=1)
    resource_id: str = Field(min_length=1)
    source_chat_id: int | None = Field(default=None)
    source_chat_record_id: int | None = Field(default=None)
    source_trace_id: str | None = Field(default=None)
    actor_account: str = Field(min_length=1)
    event_type: QueryResourceLearningFeedbackEventType
    question_text: str | None = Field(default=None)
    matched_sql: str | None = Field(default=None)
    error_code: str | None = Field(default=None)
    error_message: str | None = Field(default=None)
    before_snapshot: dict = Field(default_factory=dict)
    after_snapshot: dict = Field(default_factory=dict)
    patch_types: list[QueryResourceLearningPatchType] = Field(default_factory=list)
    visibility: QueryResourceLearningFeedbackVisibility
    created_at: datetime


class QueryResourceLearningPatchItem(BaseModel):
    id: int = Field(gt=0)
    resource_id: str = Field(min_length=1)
    patch_type: QueryResourceLearningPatchType
    status: str = Field(min_length=1)
    priority: int
    match_fingerprint: str = Field(min_length=1)
    source_event_id: int = Field(gt=0)
    activated_at: datetime
    deactivated_at: datetime | None = None


class QueryResourceLearningPatchDisableResponse(BaseModel):
    patch_id: int = Field(gt=0)
    resource_id: str = Field(min_length=1)
    disabled: bool
    event_no: str = Field(min_length=1)


class QueryResourceLearningPatchDisableRequest(BaseModel):
    actor_account: str = Field(default="system", min_length=1)
    reason: str | None = Field(default=None)


class QueryResourceLearningEvaluateRelearningResponse(BaseModel):
    resource_id: str = Field(min_length=1)
    relearning_suggested: bool = False
    trigger_reason: str = Field(default="observe", min_length=1)
    relearning_advice: str = Field(default="当前反馈稳定，建议持续观察。", min_length=1)
    metric: QueryResourceLearningFeedbackMetricResponse
