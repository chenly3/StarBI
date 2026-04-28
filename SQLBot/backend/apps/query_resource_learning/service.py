from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta
from hashlib import sha256
from typing import TYPE_CHECKING, Any, TypedDict
from uuid import uuid4

from sqlmodel import SQLModel, select

from apps.query_resource_learning.models import (
    QueryResourceLearningFeedbackEvent,
    QueryResourceLearningFeedbackMetric,
    QueryResourceLearningPatchApplyLog,
    QueryResourceLearningPatchSnapshot,
    QueryResourceLearningResult,
    QueryResourceLearningScore,
    QueryResourceLearningTask,
)
from apps.query_resource_learning.schemas import (
    LearningTaskStatus,
    QueryResourceLearningFeedbackEventRequest,
    QueryResourceLearningFeedbackEventType,
    QueryResourceLearningFeedbackVisibility,
)

if TYPE_CHECKING:
    from apps.datasource.models.datasource import CoreDatasource


class LearningGradeResult(TypedDict):
    grade: str
    score: int


class LearningQualitySummary(TypedDict):
    resource_id: str
    score: int
    grade: str
    risks: list[str]
    suggestions: list[str]
    signals: list[str]


class LearningFeedbackSummary(TypedDict):
    resource_id: str
    total_feedback_count: int
    downvote_count: int
    downvote_rate: int
    failure_count: int
    failure_rate: int
    recent_issues: list[str]
    relearning_suggested: bool
    trigger_reason: str
    relearning_advice: str


class RelearningDecision(TypedDict):
    relearning_suggested: bool
    trigger_reason: str
    relearning_advice: str


class LearningExecutionResult(TypedDict):
    resource_id: str
    task_status: str
    task: QueryResourceLearningTask
    result: QueryResourceLearningResult | None
    score: QueryResourceLearningScore | None


FAILURE_RATE_THRESHOLD = 30
DOWNVOTE_RATE_THRESHOLD = 20
SQL_KEYWORDS = ("select ", "with ", "insert ", "update ", "delete ", "from ")
NUMERIC_FIELD_MARKERS = ("amount", "amt", "sales", "revenue", "price", "cost", "qty", "count", "num", "gmv")
TIME_FIELD_MARKERS = ("date", "time", "day", "month", "year", "dt", "created_at", "updated_at")
ID_FIELD_MARKERS = ("id", "code", "no", "number")
SENSITIVE_FIELD_MARKERS = ("phone", "mobile", "email", "身份证", "id_card", "address")

RELEARNING_ADVICE_BY_REASON = {
    "schema_changed": "检测到数据结构已变更，建议立即重新学习以刷新问数资产。",
    "failure_rate_high": "近期失败率偏高，建议重新学习并复核字段语义与样本值。",
    "downvote_rate_high": "近期点踩率偏高，建议重新学习并补充推荐问法与术语映射。",
    "observe": "当前反馈稳定，建议持续观察。",
}
PATCH_STATUS_ACTIVE = "active"
PATCH_STATUS_INACTIVE = "inactive"
PATCH_VERSION = 1
FEEDBACK_WINDOW_DAYS = 7
SQL_OVERRIDE_PATCH_TYPE = "sql_override"
READONLY_SQL_PREFIXES = ("select", "with")
DANGEROUS_SQL_KEYWORDS = (
    " insert ",
    " update ",
    " delete ",
    " drop ",
    " truncate ",
    " alter ",
    " create ",
    " grant ",
    " revoke ",
    " merge ",
    " call ",
    " execute ",
)
FEEDBACK_RATE_EVENT_TYPES = {
    QueryResourceLearningFeedbackEventType.UPVOTE.value,
    QueryResourceLearningFeedbackEventType.DOWNVOTE.value,
    QueryResourceLearningFeedbackEventType.EXECUTION_FAILURE.value,
    QueryResourceLearningFeedbackEventType.MANUAL_FIX_SUBMIT.value,
}


def should_trigger_relearning(
    *,
    failure_rate: int,
    downvote_rate: int,
    schema_changed: bool,
) -> bool:
    if schema_changed:
        return True
    if failure_rate >= FAILURE_RATE_THRESHOLD:
        return True
    if downvote_rate >= DOWNVOTE_RATE_THRESHOLD:
        return True
    return False


def build_relearning_decision(
    *,
    failure_rate: int,
    downvote_rate: int,
    schema_changed: bool,
) -> RelearningDecision:
    trigger_reason = "observe"
    if schema_changed:
        trigger_reason = "schema_changed"
    elif failure_rate >= FAILURE_RATE_THRESHOLD:
        trigger_reason = "failure_rate_high"
    elif downvote_rate >= DOWNVOTE_RATE_THRESHOLD:
        trigger_reason = "downvote_rate_high"

    return {
        "relearning_suggested": trigger_reason != "observe",
        "trigger_reason": trigger_reason,
        "relearning_advice": RELEARNING_ADVICE_BY_REASON[trigger_reason],
    }


def calculate_learning_grade(
    *,
    field_completion: int,
    semantic_clarity: int,
    sample_coverage: int,
    terminology_coverage: int,
    sql_example_coverage: int,
    query_success_rate: int,
) -> LearningGradeResult:
    metrics = [
        field_completion,
        semantic_clarity,
        sample_coverage,
        terminology_coverage,
        sql_example_coverage,
        query_success_rate,
    ]
    score = round(sum(metrics) / len(metrics))
    if score >= 90:
        grade = "A"
    elif score >= 75:
        grade = "B"
    elif score >= 60:
        grade = "C"
    else:
        grade = "D"
    return {"grade": grade, "score": score}


def build_quality_summary(
    *,
    resource_id: str,
    score: int,
    grade: str,
    signals: list[str],
    suggestions: list[str],
) -> LearningQualitySummary:
    risks = [] if score >= 75 else ["学习质量偏低"]
    return {
        "resource_id": resource_id,
        "score": score,
        "grade": grade,
        "risks": risks,
        "suggestions": list(suggestions),
        "signals": list(signals),
    }


def build_feedback_summary(
    *,
    resource_id: str,
    downvote_count: int,
    failure_count: int,
    total_feedback_count: int,
    recent_issues: list[str],
    schema_changed: bool,
) -> LearningFeedbackSummary:
    if total_feedback_count:
        failure_rate = round((failure_count / total_feedback_count) * 100)
        downvote_rate = round((downvote_count / total_feedback_count) * 100)
    else:
        failure_rate = 0
        downvote_rate = 0
    relearning_decision = build_relearning_decision(
        failure_rate=failure_rate,
        downvote_rate=downvote_rate,
        schema_changed=schema_changed,
    )

    return {
        "resource_id": resource_id,
        "total_feedback_count": total_feedback_count,
        "downvote_count": downvote_count,
        "downvote_rate": downvote_rate,
        "failure_count": failure_count,
        "failure_rate": failure_rate,
        "recent_issues": list(recent_issues),
        **relearning_decision,
    }


def parse_datasource_id(resource_id: str) -> int | None:
    if not resource_id:
        return None
    candidate = resource_id.split(":", 1)[1] if resource_id.startswith("datasource:") else resource_id
    if candidate.isdigit():
        return int(candidate)
    return None


def resolve_resource_display_name(
    session: Any,
    resource_id: str,
    result: QueryResourceLearningResult | None = None,
) -> str:
    semantic_profile = result.semantic_profile if result and isinstance(result.semantic_profile, dict) else {}
    dataset_name = (
        semantic_profile.get("dataset_name")
        or semantic_profile.get("resource_name")
        or semantic_profile.get("name")
    )
    if dataset_name:
        return str(dataset_name)

    datasource_id = parse_datasource_id(resource_id)
    datasource = load_datasource(session, datasource_id)
    if datasource and datasource.name:
        return str(datasource.name)
    return resource_id


def build_learning_suggestions(
    result: QueryResourceLearningResult | None,
    score: QueryResourceLearningScore | None,
) -> list[str]:
    suggestions: list[str] = []
    semantic_profile = result.semantic_profile if result and isinstance(result.semantic_profile, dict) else {}
    fields = semantic_profile.get("fields") or []
    if not fields:
        suggestions.append("补充数据集字段定义后重新学习。")
    elif not any(str((field or {}).get("description") or "").strip() for field in fields if isinstance(field, dict)):
        suggestions.append("建议补充核心字段描述，提升语义理解准确率。")
    if not (result.sample_values if result else []):
        suggestions.append("建议补充维值样本，提升自然语言过滤值匹配效果。")
    if not (semantic_profile.get("terminology_mappings") or []):
        suggestions.append("建议维护术语映射，提升业务口径命中率。")
    if not (semantic_profile.get("sql_examples") or []):
        suggestions.append("建议补充 SQL 示例，提升 SQL 生成稳定性。")
    if not suggestions and score and score.score >= 90:
        suggestions.append("当前学习资产较完整，可持续观察问数反馈。")
    return suggestions


def format_learning_time(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.strftime("%Y-%m-%d %H:%M:%S")


def _load_rows(session: Any, model: type[SQLModel]) -> list[Any]:
    return list(session.exec(select(model)).all())


def load_datasource(session: Any, datasource_id: int | None) -> CoreDatasource | None:
    from apps.datasource.models.datasource import CoreDatasource

    if datasource_id is None:
        return None
    for row in _load_rows(session, CoreDatasource):
        if getattr(row, "id", None) == datasource_id:
            return row
    return None


def _normalize_text(value: Any) -> str:
    return str(value or "").strip()


def _looks_like_sql(value: str) -> bool:
    normalized = _normalize_text(value).lower()
    return any(keyword in normalized for keyword in SQL_KEYWORDS)


def _contains_any(value: str, markers: tuple[str, ...]) -> bool:
    normalized = value.lower()
    return any(marker in normalized for marker in markers)


def _infer_field_role(field_name: str, field_type: str, description: str) -> dict[str, Any]:
    search_text = f"{field_name} {description}".lower()
    type_text = field_type.lower()
    is_time = _contains_any(search_text, TIME_FIELD_MARKERS) or "date" in type_text or "time" in type_text
    is_metric = (
        any(token in type_text for token in ("int", "decimal", "number", "double", "float", "numeric"))
        and _contains_any(search_text, NUMERIC_FIELD_MARKERS)
    )
    is_id = field_name.lower() == "id" or _contains_any(search_text, ID_FIELD_MARKERS)
    is_sensitive = _contains_any(search_text, SENSITIVE_FIELD_MARKERS)
    semantic_type = "dimension"
    if is_time:
        semantic_type = "time"
    elif is_metric:
        semantic_type = "metric"
    return {
        "semantic_type": semantic_type,
        "is_metric": is_metric,
        "is_dimension": not is_metric,
        "is_time": is_time,
        "is_id": is_id,
        "is_sensitive": is_sensitive,
    }


def _build_field_profiles(session: Any, datasource_id: int | None) -> list[dict[str, Any]]:
    from apps.datasource.models.datasource import CoreField, CoreTable

    if datasource_id is None:
        return []

    tables = [
        row
        for row in _load_rows(session, CoreTable)
        if getattr(row, "ds_id", None) == datasource_id and getattr(row, "checked", True) is not False
    ]
    table_map = {row.id: row for row in tables}
    fields = [
        row
        for row in _load_rows(session, CoreField)
        if getattr(row, "ds_id", None) == datasource_id
        and getattr(row, "checked", True) is not False
        and getattr(row, "table_id", None) in table_map
    ]
    fields.sort(key=lambda row: ((row.table_id or 0), (row.field_index or 0), _normalize_text(row.field_name)))

    field_profiles: list[dict[str, Any]] = []
    for field in fields:
        description = _normalize_text(getattr(field, "custom_comment", None) or getattr(field, "field_comment", None))
        field_name = _normalize_text(getattr(field, "field_name", None))
        field_type = _normalize_text(getattr(field, "field_type", None))
        role = _infer_field_role(field_name, field_type, description)
        table = table_map.get(field.table_id)
        field_profiles.append(
            {
                "id": getattr(field, "id", None),
                "table_id": getattr(field, "table_id", None),
                "table_name": _normalize_text(getattr(table, "table_name", None)),
                "field_name": field_name,
                "display_name": description or field_name,
                "field_type": field_type,
                "description": description,
                **role,
            }
        )
    return field_profiles


def _build_terminology_mappings(session: Any, datasource_id: int | None) -> list[dict[str, str]]:
    try:
        from apps.terminology.models.terminology_model import Terminology
    except Exception:
        return []

    rows = [row for row in _load_rows(session, Terminology) if getattr(row, "enabled", True) is not False]
    if not rows:
        return []

    parent_map = {row.id: row for row in rows if getattr(row, "pid", None) is None}
    mappings: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()

    def applicable(term: Terminology) -> bool:
        if datasource_id is None:
            return True
        if not getattr(term, "specific_ds", False):
            return True
        datasource_ids = getattr(term, "datasource_ids", None) or []
        return datasource_id in datasource_ids

    for row in rows:
        if not applicable(row):
            continue
        word = _normalize_text(getattr(row, "word", None))
        description = _normalize_text(getattr(row, "description", None))
        if getattr(row, "pid", None) is None:
            target = description or word
        else:
            parent = parent_map.get(row.pid)
            target = _normalize_text(getattr(parent, "word", None)) or description or word
        if word and target and (word, target) not in seen:
            seen.add((word, target))
            mappings.append({"term": word, "target": target})
    return mappings


def _build_training_assets(session: Any, datasource_id: int | None) -> tuple[list[dict[str, str]], list[str]]:
    from apps.datasource.models.datasource import DsRecommendedProblem

    if datasource_id is None:
        return [], []

    try:
        from apps.data_training.models.data_training_model import DataTraining
    except Exception:
        training_rows = []
    else:
        training_rows = [
            row
            for row in _load_rows(session, DataTraining)
            if getattr(row, "enabled", True) is not False and getattr(row, "datasource", None) == datasource_id
        ]
    training_rows.sort(
        key=lambda row: (
            getattr(row, "create_time", None) or datetime.min,
            getattr(row, "id", 0) or 0,
        ),
        reverse=True,
    )

    sql_examples: list[dict[str, str]] = []
    training_questions: list[str] = []
    seen_questions: set[str] = set()
    for row in training_rows:
        question = _normalize_text(getattr(row, "question", None))
        description = _normalize_text(getattr(row, "description", None))
        if question and question not in seen_questions:
            seen_questions.add(question)
            training_questions.append(question)
        if question and description and _looks_like_sql(description):
            sql_examples.append({"question": question, "sql": description})

    manual_rows = [
        row
        for row in _load_rows(session, DsRecommendedProblem)
        if getattr(row, "datasource_id", None) == datasource_id
    ]
    manual_rows.sort(
        key=lambda row: (
            getattr(row, "sort", None) if getattr(row, "sort", None) is not None else 1_000_000,
            -int(getattr(row, "id", 0) or 0),
        )
    )

    manual_questions: list[str] = []
    for row in manual_rows:
        question = _normalize_text(getattr(row, "question", None))
        if question and question not in manual_questions:
            manual_questions.append(question)

    return sql_examples, manual_questions or training_questions


def _build_sample_values(session: Any, field_profiles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not hasattr(session, "query"):
        return []

    sample_fields = [
        field
        for field in field_profiles
        if not field.get("is_metric") and not field.get("is_sensitive") and not field.get("is_id")
    ][:5]
    if not sample_fields:
        return []

    try:
        from apps.datasource.crud.datasource import fieldEnum
    except Exception:
        return []

    sample_values: list[dict[str, Any]] = []
    for field in sample_fields:
        field_id = field.get("id")
        if not field_id:
            continue
        try:
            values = fieldEnum(session, field_id)
        except Exception:
            continue
        normalized_values: list[str] = []
        for value in values or []:
            text = _normalize_text(value)
            if text and text not in normalized_values:
                normalized_values.append(text)
            if len(normalized_values) >= 5:
                break
        if normalized_values:
            sample_values.append({"field": field["field_name"], "values": normalized_values})
    return sample_values


def _derive_recommended_questions(field_profiles: list[dict[str, Any]], dataset_name: str) -> list[str]:
    metric_fields = [field for field in field_profiles if field.get("is_metric")]
    dimension_fields = [field for field in field_profiles if field.get("is_dimension") and not field.get("is_time")]
    time_fields = [field for field in field_profiles if field.get("is_time")]

    questions: list[str] = []
    if metric_fields and time_fields:
        questions.append(f"最近30天{metric_fields[0]['display_name']}")
    if metric_fields and dimension_fields:
        questions.append(f"按{dimension_fields[0]['display_name']}分析{metric_fields[0]['display_name']}")
    if metric_fields:
        questions.append(f"{dataset_name}有哪些核心指标变化")

    deduped: list[str] = []
    for question in questions:
        normalized = _normalize_text(question)
        if normalized and normalized not in deduped:
            deduped.append(normalized)
    return deduped


def _build_dataset_meta(session: Any, resource_id: str) -> tuple[dict[str, Any], list[Any], list[Any], list[Any], list[str]]:
    datasource_id = parse_datasource_id(resource_id)
    datasource = load_datasource(session, datasource_id)
    dataset_name = _normalize_text(getattr(datasource, "name", None)) or resource_id
    dataset_description = _normalize_text(getattr(datasource, "description", None))

    field_profiles = _build_field_profiles(session, datasource_id)
    terminology_mappings = _build_terminology_mappings(session, datasource_id)
    sql_examples, recommended_questions = _build_training_assets(session, datasource_id)
    if not recommended_questions:
        recommended_questions = _derive_recommended_questions(field_profiles, dataset_name)
    sample_values = _build_sample_values(session, field_profiles)

    dataset_meta = {
        "name": dataset_name,
        "description": dataset_description,
        "datasource_id": datasource_id,
        "fields": field_profiles,
    }
    return dataset_meta, sample_values, terminology_mappings, sql_examples, recommended_questions


def _build_learning_signals(result_payload: dict[str, Any]) -> list[str]:
    semantic_profile = result_payload.get("semantic_profile", {})
    fields = semantic_profile.get("fields") or []
    terminology_mappings = semantic_profile.get("terminology_mappings") or []
    sql_examples = semantic_profile.get("sql_examples") or []
    sample_values = result_payload.get("sample_values") or []
    recommended_questions = result_payload.get("recommended_questions") or []

    signals: list[str] = []
    if fields:
        signals.append(f"已完成 {len(fields)} 个字段的语义加工")
    if sample_values:
        signals.append(f"已生成 {len(sample_values)} 个字段的值样本")
    if terminology_mappings:
        signals.append(f"已绑定 {len(terminology_mappings)} 条术语映射")
    if sql_examples:
        signals.append(f"已关联 {len(sql_examples)} 条 SQL 示例")
    if recommended_questions:
        signals.append(f"已沉淀 {len(recommended_questions)} 个推荐问法")
    if not signals:
        signals.append("已完成基础资源学习")
    return signals


def _calculate_learning_metrics(result_payload: dict[str, Any]) -> dict[str, int]:
    semantic_profile = result_payload.get("semantic_profile", {})
    fields = semantic_profile.get("fields") or []
    sample_values = result_payload.get("sample_values") or []
    terminology_mappings = semantic_profile.get("terminology_mappings") or []
    sql_examples = semantic_profile.get("sql_examples") or []

    if not fields:
        return {
            "field_completion": 40,
            "semantic_clarity": 45,
            "sample_coverage": 35,
            "terminology_coverage": 40,
            "sql_example_coverage": 35,
            "query_success_rate": 55,
        }

    described_fields = [
        field
        for field in fields
        if isinstance(field, dict) and _normalize_text(field.get("description"))
    ]
    time_fields = [field for field in fields if isinstance(field, dict) and field.get("is_time")]
    metric_fields = [field for field in fields if isinstance(field, dict) and field.get("is_metric")]
    field_completion = round(60 + (len(described_fields) / len(fields)) * 40)
    semantic_clarity = round(55 + (min(len(time_fields) + len(metric_fields), len(fields)) / len(fields)) * 45)
    sample_coverage = min(100, 35 + len(sample_values) * 15)
    terminology_coverage = min(100, 40 + len(terminology_mappings) * 8)
    sql_example_coverage = min(100, 35 + len(sql_examples) * 20)
    query_success_rate = min(95, 60 + len(fields) * 2 + len(terminology_mappings) * 2)
    return {
        "field_completion": field_completion,
        "semantic_clarity": semantic_clarity,
        "sample_coverage": sample_coverage,
        "terminology_coverage": terminology_coverage,
        "sql_example_coverage": sql_example_coverage,
        "query_success_rate": query_success_rate,
    }


def _next_learning_version(session: Any, resource_id: str) -> int:
    versions = [
        int(getattr(row, "version", 0) or 0)
        for row in _load_rows(session, QueryResourceLearningResult)
        if getattr(row, "resource_id", None) == resource_id
    ]
    return (max(versions) if versions else 0) + 1


def _normalize_feedback_payload(
    payload: QueryResourceLearningFeedbackEventRequest | dict[str, Any],
) -> QueryResourceLearningFeedbackEventRequest:
    if isinstance(payload, QueryResourceLearningFeedbackEventRequest):
        return payload
    return QueryResourceLearningFeedbackEventRequest.model_validate(payload)


def _generate_event_no(now: datetime | None = None) -> str:
    current = now or datetime.now()
    return f"qrl_{current.strftime('%Y%m%d%H%M%S%f')}_{uuid4().hex[:8]}"


def _hash_text(value: str | None) -> str | None:
    text = _normalize_text(value)
    if not text:
        return None
    return sha256(text.encode("utf-8")).hexdigest()


def _build_match_fingerprint(
    *,
    resource_id: str,
    question_text: str | None,
    matched_sql: str | None,
) -> str:
    payload = "|".join(
        [
            _normalize_text(resource_id),
            _normalize_text(question_text),
            _normalize_text(matched_sql),
        ]
    )
    return sha256(payload.encode("utf-8")).hexdigest()


def _percentage(count: int, total: int) -> int:
    if total <= 0:
        return 0
    return round((count / total) * 100)


def _safe_flush(session: Any) -> None:
    flush = getattr(session, "flush", None)
    if callable(flush):
        flush()


def _to_naive_datetime(value: datetime | None) -> datetime | None:
    if value is None or value.tzinfo is None:
        return value
    return value.astimezone().replace(tzinfo=None)


def _is_safe_read_sql(statement: str | None) -> bool:
    normalized = _normalize_text(statement).lower()
    if not normalized:
        return False
    segments = [segment.strip() for segment in normalized.split(";") if segment.strip()]
    if len(segments) != 1:
        return False
    single_statement = segments[0]
    if not single_statement.startswith(READONLY_SQL_PREFIXES):
        return False
    wrapped = f" {single_statement} "
    return not any(keyword in wrapped for keyword in DANGEROUS_SQL_KEYWORDS)


def _extract_sql_override_candidates(request: QueryResourceLearningFeedbackEventRequest) -> list[str]:
    candidates: list[str] = []
    for candidate in (
        request.matched_sql,
        request.after_snapshot.get("sql"),
        request.after_snapshot.get("matched_sql"),
        request.after_snapshot.get("override_sql"),
    ):
        normalized = _normalize_text(candidate)
        if normalized and normalized not in candidates:
            candidates.append(normalized)
    return candidates


def _validate_sql_override_payload(
    request: QueryResourceLearningFeedbackEventRequest,
    *,
    patch_types: list[str],
) -> None:
    if SQL_OVERRIDE_PATCH_TYPE not in patch_types:
        return
    candidates = _extract_sql_override_candidates(request)
    if not candidates:
        raise ValueError("sql_override requires matched_sql or after_snapshot.sql")
    if any(not _is_safe_read_sql(sql) for sql in candidates):
        raise ValueError("sql_override only supports single SELECT/WITH statements")


def _load_resource_events(
    session: Any,
    resource_id: str,
) -> list[QueryResourceLearningFeedbackEvent]:
    return [
        row
        for row in _load_rows(session, QueryResourceLearningFeedbackEvent)
        if getattr(row, "resource_id", None) == resource_id
    ]


def _load_resource_patches(
    session: Any,
    resource_id: str,
) -> list[QueryResourceLearningPatchSnapshot]:
    return [
        row
        for row in _load_rows(session, QueryResourceLearningPatchSnapshot)
        if getattr(row, "resource_id", None) == resource_id
    ]


def _extract_sql_override_from_patch(patch: QueryResourceLearningPatchSnapshot) -> str:
    patch_payload = patch.patch_payload if isinstance(patch.patch_payload, dict) else {}
    after_snapshot = patch_payload.get("after_snapshot") if isinstance(patch_payload.get("after_snapshot"), dict) else {}
    candidates = (
        after_snapshot.get("sql"),
        after_snapshot.get("matched_sql"),
        after_snapshot.get("override_sql"),
        patch_payload.get("sql"),
        patch_payload.get("override_sql"),
    )
    for candidate in candidates:
        normalized = _normalize_text(candidate)
        if normalized:
            return normalized
    return ""


def find_active_sql_override_patch(
    session: Any,
    *,
    resource_id: str,
    question_text: str | None,
    matched_sql: str | None = None,
) -> QueryResourceLearningPatchSnapshot | None:
    normalized_question = _normalize_text(question_text)
    normalized_matched_sql = _normalize_text(matched_sql)
    if not resource_id or not normalized_question:
        return None

    matched_patches: list[QueryResourceLearningPatchSnapshot] = []
    for patch in _load_resource_patches(session, resource_id):
        if patch.status != PATCH_STATUS_ACTIVE or patch.patch_type != SQL_OVERRIDE_PATCH_TYPE:
            continue
        match_rule = patch.match_rule if isinstance(patch.match_rule, dict) else {}
        patch_question = _normalize_text(match_rule.get("question_text"))
        patch_matched_sql = _normalize_text(match_rule.get("matched_sql"))
        if patch_question != normalized_question:
            continue
        if normalized_matched_sql and patch_matched_sql and patch_matched_sql != normalized_matched_sql:
            continue
        override_sql = _extract_sql_override_from_patch(patch)
        if not _is_safe_read_sql(override_sql):
            continue
        matched_patches.append(patch)

    matched_patches.sort(key=lambda item: (item.priority, -(item.id or 0)))
    return matched_patches[0] if matched_patches else None


def record_patch_apply_log(
    session: Any,
    *,
    resource_id: str,
    chat_record_id: int | None,
    trace_id: str,
    question_text: str | None,
    pre_sql: str | None,
    post_sql: str | None,
    applied_patch_ids: list[Any],
    apply_result: str,
    error_message: str | None = None,
) -> QueryResourceLearningPatchApplyLog:
    log = QueryResourceLearningPatchApplyLog(
        resource_id=resource_id,
        chat_record_id=chat_record_id,
        trace_id=trace_id,
        question_text=question_text,
        question_hash=_hash_text(question_text),
        pre_sql=pre_sql,
        post_sql=post_sql,
        applied_patch_ids=list(applied_patch_ids or []),
        apply_result=apply_result,
        error_message=error_message,
    )
    session.add(log)
    _safe_flush(session)
    return log


def _find_feedback_metric_row(session: Any, resource_id: str) -> QueryResourceLearningFeedbackMetric | None:
    for row in _load_rows(session, QueryResourceLearningFeedbackMetric):
        if getattr(row, "resource_id", None) == resource_id:
            return row
    return None


def _build_metric_payload(
    *,
    resource_id: str,
    events: list[QueryResourceLearningFeedbackEvent],
    now: datetime,
) -> dict[str, Any]:
    feedback_events = [event for event in events if event.event_type in FEEDBACK_RATE_EVENT_TYPES]
    lifetime_total_feedback_count = len(feedback_events)
    lifetime_downvote_count = sum(
        1
        for event in feedback_events
        if event.event_type == QueryResourceLearningFeedbackEventType.DOWNVOTE.value
    )
    lifetime_failure_count = sum(
        1
        for event in feedback_events
        if event.event_type == QueryResourceLearningFeedbackEventType.EXECUTION_FAILURE.value
    )
    lifetime_correction_count = sum(
        1
        for event in feedback_events
        if event.event_type == QueryResourceLearningFeedbackEventType.MANUAL_FIX_SUBMIT.value
    )

    window_start = now - timedelta(days=FEEDBACK_WINDOW_DAYS)
    window_events = [event for event in feedback_events if event.created_at >= window_start]
    window_7d_total_feedback_count = len(window_events)
    window_downvote_count = sum(
        1 for event in window_events if event.event_type == QueryResourceLearningFeedbackEventType.DOWNVOTE.value
    )
    window_failure_count = sum(
        1
        for event in window_events
        if event.event_type == QueryResourceLearningFeedbackEventType.EXECUTION_FAILURE.value
    )
    window_correction_count = sum(
        1
        for event in window_events
        if event.event_type == QueryResourceLearningFeedbackEventType.MANUAL_FIX_SUBMIT.value
    )
    window_7d_downvote_rate = _percentage(window_downvote_count, window_7d_total_feedback_count)
    window_7d_failure_rate = _percentage(window_failure_count, window_7d_total_feedback_count)
    window_7d_correction_rate = _percentage(window_correction_count, window_7d_total_feedback_count)

    relearning_decision = build_relearning_decision(
        failure_rate=window_7d_failure_rate,
        downvote_rate=window_7d_downvote_rate,
        schema_changed=False,
    )
    last_event_at = max((event.created_at for event in events), default=None)

    return {
        "resource_id": resource_id,
        "lifetime_total_feedback_count": lifetime_total_feedback_count,
        "lifetime_downvote_count": lifetime_downvote_count,
        "lifetime_failure_count": lifetime_failure_count,
        "lifetime_correction_count": lifetime_correction_count,
        "window_7d_total_feedback_count": window_7d_total_feedback_count,
        "window_7d_downvote_rate": window_7d_downvote_rate,
        "window_7d_failure_rate": window_7d_failure_rate,
        "window_7d_correction_rate": window_7d_correction_rate,
        "relearning_suggested": relearning_decision["relearning_suggested"],
        "trigger_reason": relearning_decision["trigger_reason"],
        "relearning_advice": relearning_decision["relearning_advice"],
        "last_event_at": last_event_at,
        "updated_at": now,
    }


def _upsert_feedback_metric(
    session: Any,
    *,
    resource_id: str,
) -> QueryResourceLearningFeedbackMetric:
    now = datetime.now()
    events = _load_resource_events(session, resource_id)
    payload = _build_metric_payload(resource_id=resource_id, events=events, now=now)
    metric_row = _find_feedback_metric_row(session, resource_id)
    if metric_row is None:
        metric_row = QueryResourceLearningFeedbackMetric(**payload)
        session.add(metric_row)
        return metric_row

    for field_name, field_value in payload.items():
        if field_name == "resource_id":
            continue
        setattr(metric_row, field_name, field_value)
    return metric_row


def _metric_to_dict(metric_row: QueryResourceLearningFeedbackMetric) -> dict[str, Any]:
    return {
        "lifetime_total_feedback_count": metric_row.lifetime_total_feedback_count,
        "lifetime_downvote_count": metric_row.lifetime_downvote_count,
        "lifetime_failure_count": metric_row.lifetime_failure_count,
        "lifetime_correction_count": metric_row.lifetime_correction_count,
        "window_7d_total_feedback_count": metric_row.window_7d_total_feedback_count,
        "window_7d_downvote_rate": metric_row.window_7d_downvote_rate,
        "window_7d_failure_rate": metric_row.window_7d_failure_rate,
        "window_7d_correction_rate": metric_row.window_7d_correction_rate,
        "relearning_suggested": metric_row.relearning_suggested,
        "trigger_reason": metric_row.trigger_reason,
        "relearning_advice": metric_row.relearning_advice,
    }


def _patch_to_dict(patch: QueryResourceLearningPatchSnapshot) -> dict[str, Any]:
    return {
        "id": patch.id,
        "resource_id": patch.resource_id,
        "patch_type": patch.patch_type,
        "status": patch.status,
        "priority": patch.priority,
        "match_fingerprint": patch.match_fingerprint,
        "source_event_id": patch.source_event_id,
        "activated_at": patch.activated_at,
        "deactivated_at": patch.deactivated_at,
    }


def _event_to_dict(event: QueryResourceLearningFeedbackEvent) -> dict[str, Any]:
    return {
        "event_no": event.event_no,
        "resource_id": event.resource_id,
        "source_chat_id": event.source_chat_id,
        "source_chat_record_id": event.source_chat_record_id,
        "source_trace_id": event.source_trace_id,
        "actor_account": event.actor_account,
        "event_type": event.event_type,
        "question_text": event.question_text,
        "matched_sql": event.matched_sql,
        "error_code": event.error_code,
        "error_message": event.error_message,
        "before_snapshot": deepcopy(event.before_snapshot),
        "after_snapshot": deepcopy(event.after_snapshot),
        "patch_types": list(event.patch_types or []),
        "visibility": event.visibility,
        "created_at": event.created_at,
    }


def _activate_patch_snapshots_for_event(
    session: Any,
    *,
    event: QueryResourceLearningFeedbackEvent,
    actor_account: str,
    patch_types: list[str],
    before_snapshot: dict[str, Any],
    after_snapshot: dict[str, Any],
) -> None:
    if event.id is None:
        raise ValueError("feedback event id is required before creating patch snapshots")

    now = datetime.now()
    match_fingerprint = _build_match_fingerprint(
        resource_id=event.resource_id,
        question_text=event.question_text,
        matched_sql=event.matched_sql,
    )
    for patch_type in patch_types:
        for snapshot in _load_resource_patches(session, event.resource_id):
            if (
                snapshot.patch_type == patch_type
                and snapshot.match_fingerprint == match_fingerprint
                and snapshot.status == PATCH_STATUS_ACTIVE
            ):
                snapshot.status = PATCH_STATUS_INACTIVE
                snapshot.deactivated_at = now
                snapshot.disabled_by = actor_account
                snapshot.disable_reason = f"superseded_by_event:{event.event_no}"

        session.add(
            QueryResourceLearningPatchSnapshot(
                resource_id=event.resource_id,
                patch_type=patch_type,
                match_fingerprint=match_fingerprint,
                match_rule={
                    "question_text": _normalize_text(event.question_text),
                    "matched_sql": _normalize_text(event.matched_sql),
                },
                patch_payload={
                    "before_snapshot": deepcopy(before_snapshot),
                    "after_snapshot": deepcopy(after_snapshot),
                },
                priority=100,
                status=PATCH_STATUS_ACTIVE,
                source_event_id=int(event.id),
                enabled_by=actor_account,
                activated_at=now,
                version=PATCH_VERSION,
            )
        )


def submit_feedback_event(
    session: Any,
    *,
    resource_id: str,
    actor_account: str,
    payload: QueryResourceLearningFeedbackEventRequest | dict[str, Any],
) -> dict[str, Any]:
    request = _normalize_feedback_payload(payload)
    patch_types = [patch_type.value for patch_type in request.patch_types]
    event_type = request.event_type.value

    if event_type == QueryResourceLearningFeedbackEventType.MANUAL_FIX_SUBMIT.value and (
        not request.before_snapshot or not request.after_snapshot or not patch_types
    ):
        raise ValueError("manual_fix_submit requires non-empty before_snapshot, after_snapshot and patch_types")
    if event_type == QueryResourceLearningFeedbackEventType.MANUAL_FIX_SUBMIT.value and (
        not _normalize_text(request.question_text) and not _normalize_text(request.matched_sql)
    ):
        raise ValueError("manual_fix_submit requires question_text or matched_sql")
    if event_type == QueryResourceLearningFeedbackEventType.MANUAL_FIX_SUBMIT.value:
        _validate_sql_override_payload(request, patch_types=patch_types)

    event = QueryResourceLearningFeedbackEvent(
        event_no=_generate_event_no(),
        resource_id=resource_id,
        source_chat_id=request.source_chat_id,
        source_chat_record_id=request.source_chat_record_id,
        source_trace_id=request.source_trace_id,
        actor_uid=None,
        actor_account=actor_account,
        event_type=event_type,
        question_text=request.question_text,
        question_hash=_hash_text(request.question_text),
        matched_sql=request.matched_sql,
        error_code=request.error_code,
        error_message=request.error_message,
        before_snapshot=deepcopy(request.before_snapshot),
        after_snapshot=deepcopy(request.after_snapshot),
        patch_types=patch_types,
        visibility=request.visibility.value,
    )
    session.add(event)
    _safe_flush(session)

    if event_type == QueryResourceLearningFeedbackEventType.MANUAL_FIX_SUBMIT.value:
        _activate_patch_snapshots_for_event(
            session,
            event=event,
            actor_account=actor_account,
            patch_types=patch_types,
            before_snapshot=request.before_snapshot,
            after_snapshot=request.after_snapshot,
        )

    metric_row = _upsert_feedback_metric(session, resource_id=resource_id)
    active_patch_count = len(
        [patch for patch in _load_resource_patches(session, resource_id) if patch.status == PATCH_STATUS_ACTIVE]
    )
    return {
        "accepted": True,
        "event_no": event.event_no,
        "resource_id": resource_id,
        "active_patch_count": active_patch_count,
        "metric": _metric_to_dict(metric_row),
    }


def list_patches(
    session: Any,
    *,
    resource_id: str,
    status: str | None = None,
) -> list[dict[str, Any]]:
    patches = _load_resource_patches(session, resource_id)
    if status:
        patches = [patch for patch in patches if patch.status == status]
    patches.sort(key=lambda patch: (patch.priority, -(patch.id or 0)))
    return [_patch_to_dict(patch) for patch in patches]


def disable_patch(
    session: Any,
    *,
    resource_id: str,
    patch_id: int,
    actor_account: str,
    reason: str | None = None,
) -> dict[str, Any]:
    patches = _load_resource_patches(session, resource_id)
    target_patch = next((patch for patch in patches if patch.id == patch_id), None)
    if target_patch is None:
        raise ValueError(f"patch {patch_id} not found for resource {resource_id}")

    now = datetime.now()
    disabled = target_patch.status != PATCH_STATUS_INACTIVE
    if disabled:
        target_patch.status = PATCH_STATUS_INACTIVE
        target_patch.deactivated_at = now
        target_patch.disabled_by = actor_account
        target_patch.disable_reason = _normalize_text(reason) or "manual_fix_disable"

    event_no = _generate_event_no(now)
    question_text = (target_patch.match_rule or {}).get("question_text")
    matched_sql = (target_patch.match_rule or {}).get("matched_sql")
    session.add(
        QueryResourceLearningFeedbackEvent(
            event_no=event_no,
            resource_id=resource_id,
            source_chat_id=None,
            source_chat_record_id=None,
            source_trace_id=None,
            actor_uid=None,
            actor_account=actor_account,
            event_type=QueryResourceLearningFeedbackEventType.MANUAL_FIX_DISABLE.value,
            question_text=question_text,
            question_hash=_hash_text(question_text),
            matched_sql=matched_sql,
            error_code=None,
            error_message=_normalize_text(reason) or None,
            before_snapshot={
                "patch_id": target_patch.id,
                "status": PATCH_STATUS_ACTIVE if disabled else PATCH_STATUS_INACTIVE,
            },
            after_snapshot={
                "patch_id": target_patch.id,
                "status": target_patch.status,
            },
            patch_types=[target_patch.patch_type],
            visibility=QueryResourceLearningFeedbackVisibility.ADMIN_ONLY.value,
        )
    )
    _upsert_feedback_metric(session, resource_id=resource_id)
    return {
        "patch_id": patch_id,
        "resource_id": resource_id,
        "disabled": disabled,
        "event_no": event_no,
    }


def get_feedback_metric(
    session: Any,
    *,
    resource_id: str,
) -> dict[str, Any]:
    metric_row = _find_feedback_metric_row(session, resource_id)
    if metric_row is None:
        metric_row = _upsert_feedback_metric(session, resource_id=resource_id)
    return _metric_to_dict(metric_row)


def list_feedback_events(
    session: Any,
    *,
    resource_id: str,
    event_type: str | None = None,
    source_chat_record_id: int | None = None,
    created_from: datetime | None = None,
    created_to: datetime | None = None,
) -> list[dict[str, Any]]:
    events = _load_resource_events(session, resource_id)
    normalized_created_from = _to_naive_datetime(created_from)
    normalized_created_to = _to_naive_datetime(created_to)
    if (
        normalized_created_from is not None
        and normalized_created_to is not None
        and normalized_created_from > normalized_created_to
    ):
        raise ValueError("created_from must be less than or equal to created_to")
    if event_type:
        events = [event for event in events if event.event_type == event_type]
    if source_chat_record_id is not None:
        events = [
            event for event in events if int(getattr(event, "source_chat_record_id", 0) or 0) == source_chat_record_id
        ]
    if normalized_created_from is not None:
        events = [
            event
            for event in events
            if _to_naive_datetime(getattr(event, "created_at", None)) is not None
            and _to_naive_datetime(event.created_at) >= normalized_created_from
        ]
    if normalized_created_to is not None:
        events = [
            event
            for event in events
            if _to_naive_datetime(getattr(event, "created_at", None)) is not None
            and _to_naive_datetime(event.created_at) <= normalized_created_to
        ]
    events.sort(
        key=lambda event: (
            event.created_at,
            int(event.id or 0),
        ),
        reverse=True,
    )
    return [_event_to_dict(event) for event in events]


def replay_feedback_event(
    session: Any,
    *,
    resource_id: str,
    event_no: str,
) -> dict[str, Any]:
    for event in _load_resource_events(session, resource_id):
        if event.event_no == event_no:
            return _event_to_dict(event)
    raise ValueError(f"event {event_no} not found for resource {resource_id}")


def evaluate_relearning(
    session: Any,
    *,
    resource_id: str,
) -> dict[str, Any]:
    metric = get_feedback_metric(session, resource_id=resource_id)
    return {
        "resource_id": resource_id,
        "relearning_suggested": metric["relearning_suggested"],
        "trigger_reason": metric["trigger_reason"],
        "relearning_advice": metric["relearning_advice"],
        "metric": metric,
    }


class QueryResourceLearningService:
    def build_learning_result(
        self,
        *,
        resource_id: str,
        dataset_meta: dict[str, Any],
        sample_values: list[Any],
        terminology_mappings: list[Any] | None = None,
        sql_examples: list[Any] | None = None,
        recommended_questions: list[Any] | None = None,
    ) -> dict[str, Any]:
        fields = deepcopy(dataset_meta.get("fields", []))
        samples = deepcopy(sample_values)
        terminology_payload = deepcopy(terminology_mappings or [])
        sql_example_payload = deepcopy(sql_examples or [])
        question_payload = deepcopy(recommended_questions or [])
        return {
            "resource_id": resource_id,
            "semantic_profile": {
                "dataset_name": dataset_meta.get("name"),
                "resource_name": dataset_meta.get("name"),
                "description": dataset_meta.get("description") or "",
                "fields": fields,
                "terminology_mappings": terminology_payload,
                "sql_examples": sql_example_payload,
            },
            "sample_values": samples,
            "recommended_questions": question_payload,
        }

    def calculate_score(
        self,
        *,
        field_completion: int,
        semantic_clarity: int,
        sample_coverage: int,
        terminology_coverage: int,
        sql_example_coverage: int,
        query_success_rate: int,
    ) -> LearningGradeResult:
        return calculate_learning_grade(
            field_completion=field_completion,
            semantic_clarity=semantic_clarity,
            sample_coverage=sample_coverage,
            terminology_coverage=terminology_coverage,
            sql_example_coverage=sql_example_coverage,
            query_success_rate=query_success_rate,
        )


def execute_learning_for_resource(session: Any, resource_id: str) -> LearningExecutionResult:
    started_at = datetime.now()
    task = QueryResourceLearningTask(
        resource_id=resource_id,
        status=LearningTaskStatus.RUNNING.value,
        trigger_type="manual",
        started_at=started_at,
    )

    service = QueryResourceLearningService()
    try:
        dataset_meta, sample_values, terminology_mappings, sql_examples, recommended_questions = _build_dataset_meta(
            session, resource_id
        )
        result_payload = service.build_learning_result(
            resource_id=resource_id,
            dataset_meta=dataset_meta,
            sample_values=sample_values,
            terminology_mappings=terminology_mappings,
            sql_examples=sql_examples,
            recommended_questions=recommended_questions,
        )
        metrics = _calculate_learning_metrics(result_payload)
        score_result = service.calculate_score(**metrics)
        signals = _build_learning_signals(result_payload)

        result = QueryResourceLearningResult(
            resource_id=resource_id,
            version=_next_learning_version(session, resource_id),
            semantic_profile=result_payload["semantic_profile"],
            sample_values=result_payload["sample_values"],
            recommended_questions=result_payload["recommended_questions"],
        )
        score = QueryResourceLearningScore(
            resource_id=resource_id,
            grade=score_result["grade"],
            score=score_result["score"],
            signals=signals,
        )

        task.status = LearningTaskStatus.SUCCEEDED.value
        task.finished_at = datetime.now()
        task.failure_reason = None
        return {
            "resource_id": resource_id,
            "task_status": task.status,
            "task": task,
            "result": result,
            "score": score,
        }
    except Exception as exc:
        task.status = LearningTaskStatus.FAILED.value
        task.finished_at = datetime.now()
        task.failure_reason = _normalize_text(str(exc)) or "学习执行失败"
        return {
            "resource_id": resource_id,
            "task_status": task.status,
            "task": task,
            "result": None,
            "score": None,
        }
