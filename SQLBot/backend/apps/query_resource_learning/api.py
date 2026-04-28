from datetime import datetime
from typing import TypeVar

from fastapi import APIRouter, HTTPException, Query
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
    LearningQualityGrade,
    LearningTaskStatus,
    QueryResourceLearningDeleteResponse,
    QueryResourceLearningEvaluateRelearningResponse,
    QueryResourceLearningFeedbackEventCreateRequest,
    QueryResourceLearningFeedbackEventItem,
    QueryResourceLearningFeedbackEventResponse,
    QueryResourceLearningFeedbackEventType,
    QueryResourceLearningFeedbackMetricResponse,
    QueryResourceLearningFeedbackRequest,
    QueryResourceLearningFeedbackResponse,
    QueryResourceLearningFeedbackSummary,
    QueryResourceLearningPatchDisableRequest,
    QueryResourceLearningPatchDisableResponse,
    QueryResourceLearningPatchItem,
    QueryResourceLearningQualitySummary,
    QueryResourceLearningResource,
    QueryResourceLearningTaskResponse,
)
from apps.query_resource_learning.service import (
    build_feedback_summary,
    build_learning_suggestions,
    build_quality_summary,
    build_relearning_decision,
    disable_patch,
    evaluate_relearning,
    execute_learning_for_resource,
    format_learning_time,
    get_feedback_metric,
    list_feedback_events,
    list_patches,
    replay_feedback_event,
    resolve_resource_display_name,
    submit_feedback_event,
)
from apps.swagger.i18n import PLACEHOLDER_PREFIX
from common.core.deps import CurrentUser, SessionDep

router = APIRouter(
    prefix="/query-resource-learning",
    tags=["query resource learning"],
)

LearningModel = TypeVar("LearningModel", bound=SQLModel)
WS_ADMIN_REQUIRED_DETAIL = "only workspace admin can access query resource learning governance APIs"


def _load_rows(session: SessionDep, model: type[LearningModel]) -> list[LearningModel]:
    return list(session.exec(select(model)).all())


def _latest_by_resource(items: list[LearningModel]) -> dict[str, LearningModel]:
    latest_items: dict[str, LearningModel] = {}
    for item in sorted(items, key=lambda row: ((row.id or 0), row.resource_id)):
        latest_items[item.resource_id] = item
    return latest_items


def _ensure_resource_exists(
    *,
    resource_id: str,
    tasks_by_resource: dict[str, QueryResourceLearningTask],
    results_by_resource: dict[str, QueryResourceLearningResult],
    scores_by_resource: dict[str, QueryResourceLearningScore],
) -> None:
    if (
        resource_id not in tasks_by_resource
        and resource_id not in results_by_resource
        and resource_id not in scores_by_resource
    ):
        raise HTTPException(status_code=404, detail=f"resource {resource_id} not found")


def _delete_resource_records(
    session: SessionDep,
    *,
    resource_id: str,
) -> int:
    deleted_rows = 0
    for model in (
        QueryResourceLearningPatchApplyLog,
        QueryResourceLearningPatchSnapshot,
        QueryResourceLearningFeedbackEvent,
        QueryResourceLearningFeedbackMetric,
        QueryResourceLearningScore,
        QueryResourceLearningResult,
        QueryResourceLearningTask,
    ):
        rows = [row for row in _load_rows(session, model) if row.resource_id == resource_id]
        for row in rows:
            session.delete(row)
            deleted_rows += 1
    return deleted_rows


def _ensure_feedback_resource_exists(session: SessionDep, resource_id: str) -> None:
    for model in (
        QueryResourceLearningTask,
        QueryResourceLearningResult,
        QueryResourceLearningScore,
        QueryResourceLearningFeedbackEvent,
        QueryResourceLearningPatchSnapshot,
        QueryResourceLearningPatchApplyLog,
        QueryResourceLearningFeedbackMetric,
    ):
        if any(row.resource_id == resource_id for row in _load_rows(session, model)):
            return
    raise HTTPException(status_code=404, detail=f"resource {resource_id} not found")


def _map_service_error(exc: ValueError) -> HTTPException:
    detail = str(exc) or "bad request"
    if "not found" in detail:
        return HTTPException(status_code=404, detail=detail)
    return HTTPException(status_code=400, detail=detail)


def _is_workspace_admin(current_user: CurrentUser) -> bool:
    if bool(getattr(current_user, "isAdmin", False)):
        return True
    weight = int(getattr(current_user, "weight", 0) or 0)
    return weight > 0


def _require_workspace_admin(current_user: CurrentUser) -> None:
    if not _is_workspace_admin(current_user):
        raise HTTPException(status_code=403, detail=WS_ADMIN_REQUIRED_DETAIL)


@router.get(
    "/resources",
    response_model=list[QueryResourceLearningResource],
    response_model_exclude_none=True,
    summary=f"{PLACEHOLDER_PREFIX}query_resource_learning_resource_list",
    description=f"{PLACEHOLDER_PREFIX}query_resource_learning_resource_list",
)
async def list_resources(session: SessionDep) -> list[QueryResourceLearningResource]:
    latest_tasks = _latest_by_resource(_load_rows(session, QueryResourceLearningTask))
    latest_results = _latest_by_resource(_load_rows(session, QueryResourceLearningResult))
    latest_scores = _latest_by_resource(_load_rows(session, QueryResourceLearningScore))

    resources: list[QueryResourceLearningResource] = []
    for resource_id in sorted(latest_tasks):
        task = latest_tasks[resource_id]
        result = latest_results.get(resource_id)
        score = latest_scores.get(resource_id)
        resources.append(
            QueryResourceLearningResource(
                resource_id=resource_id,
                name=resolve_resource_display_name(session, resource_id, result),
                learning_status=LearningTaskStatus(task.status),
                quality_grade=LearningQualityGrade(
                    score.grade if score else LearningQualityGrade.C.value
                ),
                quality_score=score.score if score else 0,
                last_learning_time=format_learning_time(task.finished_at),
                failure_reason=task.failure_reason,
            )
        )
    return resources


@router.post(
    "/resources/{resource_id}/learn",
    response_model=QueryResourceLearningTaskResponse,
    summary=f"{PLACEHOLDER_PREFIX}query_resource_learning_trigger",
    description=f"{PLACEHOLDER_PREFIX}query_resource_learning_trigger",
)
async def learn_resource(
    session: SessionDep,
    resource_id: str,
) -> QueryResourceLearningTaskResponse:
    execution = execute_learning_for_resource(session, resource_id)
    task = execution["task"]
    session.add(task)
    result = execution.get("result")
    if result is not None:
        session.add(result)
    score = execution.get("score")
    if score is not None:
        session.add(score)
    session.commit()
    session.refresh(task)
    if result is not None:
        session.refresh(result)
    if score is not None:
        session.refresh(score)

    return QueryResourceLearningTaskResponse(
        task_id=task.id,
        resource_id=task.resource_id,
        task_status=LearningTaskStatus(execution["task_status"]),
    )


@router.delete(
    "/resources/{resource_id}",
    response_model=QueryResourceLearningDeleteResponse,
    summary=f"{PLACEHOLDER_PREFIX}query_resource_learning_delete",
    description=f"{PLACEHOLDER_PREFIX}query_resource_learning_delete",
)
async def delete_resource(
    session: SessionDep,
    resource_id: str,
) -> QueryResourceLearningDeleteResponse:
    deleted_rows = _delete_resource_records(session, resource_id=resource_id)
    if deleted_rows == 0:
        raise HTTPException(status_code=404, detail=f"resource {resource_id} not found")
    session.commit()
    return QueryResourceLearningDeleteResponse(
        resource_id=resource_id,
        deleted=True,
        deleted_rows=deleted_rows,
    )


@router.get(
    "/resources/{resource_id}/quality-summary",
    response_model=QueryResourceLearningQualitySummary,
    summary=f"{PLACEHOLDER_PREFIX}query_resource_learning_quality_summary",
    description=f"{PLACEHOLDER_PREFIX}query_resource_learning_quality_summary",
)
async def get_quality_summary(
    resource_id: str,
    session: SessionDep,
) -> QueryResourceLearningQualitySummary:
    latest_tasks = _latest_by_resource(_load_rows(session, QueryResourceLearningTask))
    latest_results = _latest_by_resource(_load_rows(session, QueryResourceLearningResult))
    latest_scores = _latest_by_resource(_load_rows(session, QueryResourceLearningScore))

    _ensure_resource_exists(
        resource_id=resource_id,
        tasks_by_resource=latest_tasks,
        results_by_resource=latest_results,
        scores_by_resource=latest_scores,
    )

    latest_score = latest_scores.get(resource_id)
    latest_result = latest_results.get(resource_id)
    if latest_score and latest_result is None:
        suggestions: list[str] = []
    elif latest_score or latest_result:
        suggestions = build_learning_suggestions(latest_result, latest_score)
    else:
        suggestions = ["暂无学习质量摘要，请先完成学习"]
    return QueryResourceLearningQualitySummary(
        **build_quality_summary(
            resource_id=resource_id,
            score=latest_score.score if latest_score else 0,
            grade=latest_score.grade if latest_score else LearningQualityGrade.C.value,
            signals=list(latest_score.signals) if latest_score else [],
            suggestions=suggestions,
        )
    )


@router.get(
    "/resources/{resource_id}/feedback-summary",
    response_model=QueryResourceLearningFeedbackSummary,
    summary=f"{PLACEHOLDER_PREFIX}query_resource_learning_feedback_summary",
    description=f"{PLACEHOLDER_PREFIX}query_resource_learning_feedback_summary",
)
async def get_feedback_summary(
    resource_id: str,
    session: SessionDep,
) -> QueryResourceLearningFeedbackSummary:
    latest_tasks = _latest_by_resource(_load_rows(session, QueryResourceLearningTask))
    latest_results = _latest_by_resource(_load_rows(session, QueryResourceLearningResult))
    latest_scores = _latest_by_resource(_load_rows(session, QueryResourceLearningScore))

    _ensure_resource_exists(
        resource_id=resource_id,
        tasks_by_resource=latest_tasks,
        results_by_resource=latest_results,
        scores_by_resource=latest_scores,
    )

    latest_task = latest_tasks.get(resource_id)
    recent_issues = [latest_task.failure_reason] if latest_task and latest_task.failure_reason else []
    failure_count = (
        1
        if latest_task
        and (
            latest_task.status == LearningTaskStatus.FAILED.value
            or bool(latest_task.failure_reason)
        )
        else 0
    )
    return QueryResourceLearningFeedbackSummary(
        **build_feedback_summary(
            resource_id=resource_id,
            downvote_count=0,
            failure_count=failure_count,
            total_feedback_count=failure_count,
            recent_issues=recent_issues,
            schema_changed=False,
        )
    )


@router.post(
    "/resources/{resource_id}/feedback/events",
    response_model=QueryResourceLearningFeedbackEventResponse,
    summary=f"{PLACEHOLDER_PREFIX}query_resource_learning_feedback_event_create",
    description=f"{PLACEHOLDER_PREFIX}query_resource_learning_feedback_event_create",
)
async def create_feedback_event(
    resource_id: str,
    payload: QueryResourceLearningFeedbackEventCreateRequest,
    session: SessionDep,
    current_user: CurrentUser,
) -> QueryResourceLearningFeedbackEventResponse:
    _require_workspace_admin(current_user)
    _ensure_feedback_resource_exists(session, resource_id)
    try:
        result = submit_feedback_event(
            session,
            resource_id=resource_id,
            actor_account=payload.actor_account,
            payload=payload.model_dump(mode="json", exclude={"actor_account"}),
        )
    except ValueError as exc:
        raise _map_service_error(exc) from exc
    session.commit()
    return QueryResourceLearningFeedbackEventResponse(**result)


@router.post(
    "/resources/{resource_id}/patches/{patch_id}/disable",
    response_model=QueryResourceLearningPatchDisableResponse,
    summary=f"{PLACEHOLDER_PREFIX}query_resource_learning_patch_disable",
    description=f"{PLACEHOLDER_PREFIX}query_resource_learning_patch_disable",
)
async def disable_feedback_patch(
    resource_id: str,
    patch_id: int,
    payload: QueryResourceLearningPatchDisableRequest,
    session: SessionDep,
    current_user: CurrentUser,
) -> QueryResourceLearningPatchDisableResponse:
    _require_workspace_admin(current_user)
    _ensure_feedback_resource_exists(session, resource_id)
    try:
        result = disable_patch(
            session,
            resource_id=resource_id,
            patch_id=patch_id,
            actor_account=payload.actor_account,
            reason=payload.reason,
        )
    except ValueError as exc:
        raise _map_service_error(exc) from exc
    session.commit()
    return QueryResourceLearningPatchDisableResponse(**result)


@router.get(
    "/resources/{resource_id}/patches",
    response_model=list[QueryResourceLearningPatchItem],
    summary=f"{PLACEHOLDER_PREFIX}query_resource_learning_patch_list",
    description=f"{PLACEHOLDER_PREFIX}query_resource_learning_patch_list",
)
async def get_patch_list(
    resource_id: str,
    session: SessionDep,
    current_user: CurrentUser,
    status: str | None = None,
) -> list[QueryResourceLearningPatchItem]:
    _require_workspace_admin(current_user)
    _ensure_feedback_resource_exists(session, resource_id)
    if status is not None and status not in {"active", "inactive"}:
        raise HTTPException(status_code=400, detail=f"invalid patch status: {status}")
    rows = list_patches(session, resource_id=resource_id, status=status)
    return [QueryResourceLearningPatchItem(**row) for row in rows]


@router.get(
    "/resources/{resource_id}/feedback/events",
    response_model=list[QueryResourceLearningFeedbackEventItem],
    summary=f"{PLACEHOLDER_PREFIX}query_resource_learning_feedback_event_list",
    description=f"{PLACEHOLDER_PREFIX}query_resource_learning_feedback_event_list",
)
async def get_feedback_event_list(
    resource_id: str,
    session: SessionDep,
    current_user: CurrentUser,
    event_type: QueryResourceLearningFeedbackEventType | None = Query(default=None),
    source_chat_record_id: int | None = Query(default=None),
    created_from: datetime | None = Query(default=None),
    created_to: datetime | None = Query(default=None),
) -> list[QueryResourceLearningFeedbackEventItem]:
    _require_workspace_admin(current_user)
    _ensure_feedback_resource_exists(session, resource_id)
    try:
        rows = list_feedback_events(
            session,
            resource_id=resource_id,
            event_type=event_type.value if event_type else None,
            source_chat_record_id=source_chat_record_id,
            created_from=created_from,
            created_to=created_to,
        )
    except ValueError as exc:
        raise _map_service_error(exc) from exc
    return [QueryResourceLearningFeedbackEventItem(**row) for row in rows]


@router.get(
    "/resources/{resource_id}/feedback/replay/{event_no}",
    response_model=QueryResourceLearningFeedbackEventItem,
    summary=f"{PLACEHOLDER_PREFIX}query_resource_learning_feedback_event_replay",
    description=f"{PLACEHOLDER_PREFIX}query_resource_learning_feedback_event_replay",
)
async def replay_single_feedback_event(
    resource_id: str,
    event_no: str,
    session: SessionDep,
    current_user: CurrentUser,
) -> QueryResourceLearningFeedbackEventItem:
    _require_workspace_admin(current_user)
    _ensure_feedback_resource_exists(session, resource_id)
    try:
        event = replay_feedback_event(session, resource_id=resource_id, event_no=event_no)
    except ValueError as exc:
        raise _map_service_error(exc) from exc
    return QueryResourceLearningFeedbackEventItem(**event)


@router.get(
    "/resources/{resource_id}/feedback-metric",
    response_model=QueryResourceLearningFeedbackMetricResponse,
    summary=f"{PLACEHOLDER_PREFIX}query_resource_learning_feedback_metric",
    description=f"{PLACEHOLDER_PREFIX}query_resource_learning_feedback_metric",
)
async def get_resource_feedback_metric(
    resource_id: str,
    session: SessionDep,
    current_user: CurrentUser,
) -> QueryResourceLearningFeedbackMetricResponse:
    _require_workspace_admin(current_user)
    _ensure_feedback_resource_exists(session, resource_id)
    metric = get_feedback_metric(session, resource_id=resource_id)
    session.commit()
    return QueryResourceLearningFeedbackMetricResponse(**metric)


@router.post(
    "/resources/{resource_id}/feedback/evaluate-relearning",
    response_model=QueryResourceLearningEvaluateRelearningResponse,
    summary=f"{PLACEHOLDER_PREFIX}query_resource_learning_feedback_evaluate_relearning",
    description=f"{PLACEHOLDER_PREFIX}query_resource_learning_feedback_evaluate_relearning",
)
async def evaluate_feedback_relearning(
    resource_id: str,
    session: SessionDep,
    current_user: CurrentUser,
) -> QueryResourceLearningEvaluateRelearningResponse:
    _require_workspace_admin(current_user)
    _ensure_feedback_resource_exists(session, resource_id)
    result = evaluate_relearning(session, resource_id=resource_id)
    session.commit()
    return QueryResourceLearningEvaluateRelearningResponse(**result)


@router.post(
    "/resources/{resource_id}/feedback",
    response_model=QueryResourceLearningFeedbackResponse,
    summary=f"{PLACEHOLDER_PREFIX}query_resource_learning_feedback",
    description=f"{PLACEHOLDER_PREFIX}query_resource_learning_feedback",
)
async def save_feedback(
    resource_id: str,
    payload: QueryResourceLearningFeedbackRequest,
) -> QueryResourceLearningFeedbackResponse:
    relearning_decision = build_relearning_decision(
        failure_rate=payload.failure_rate,
        downvote_rate=payload.downvote_rate,
        schema_changed=payload.schema_changed,
    )
    return QueryResourceLearningFeedbackResponse(
        resource_id=resource_id,
        accepted=True,
        **relearning_decision,
    )
