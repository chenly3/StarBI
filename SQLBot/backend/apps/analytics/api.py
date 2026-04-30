from typing import Any

from fastapi import APIRouter, Query
from sqlalchemy import desc, func
from sqlmodel import select

from apps.chat.models.chat_model import ChatRecord
from common.core.deps import SessionDep


router = APIRouter(tags=["Analytics"], prefix="/analytics")


def _failure_reason(error: str | None) -> str:
    text = (error or "").strip()
    if not text:
        return "unknown"
    lower = text.lower()
    if "permission" in lower or "unauthorized" in lower:
        return "permission"
    if "timeout" in lower:
        return "timeout"
    if "sql" in lower:
        return "sql"
    return text[:120]


@router.get("/dashboard")
async def dashboard(session: SessionDep, limit: int = Query(default=10, ge=1, le=50)) -> dict[str, Any]:
    total_queries = session.exec(select(func.count()).select_from(ChatRecord)).one()
    failed_queries = session.exec(
        select(func.count()).select_from(ChatRecord).where(ChatRecord.error.is_not(None))
    ).one()
    finished_queries = session.exec(
        select(func.count()).select_from(ChatRecord).where(ChatRecord.finish.is_(True))
    ).one()
    successful_queries = max((finished_queries or 0) - (failed_queries or 0), 0)
    success_rate = round((successful_queries / total_queries) * 100, 2) if total_queries else 0
    recent_failures = session.exec(
        select(ChatRecord.error)
        .where(ChatRecord.error.is_not(None))
        .order_by(desc(ChatRecord.finish_time), desc(ChatRecord.create_time))
        .limit(limit)
    ).all()
    failure_counts: dict[str, int] = {}
    for error in recent_failures:
        reason = _failure_reason(error)
        failure_counts[reason] = failure_counts.get(reason, 0) + 1
    failure_reasons = [
        {"reason": reason, "count": count}
        for reason, count in sorted(failure_counts.items(), key=lambda item: item[1], reverse=True)
    ]
    data = {
        "totalQueries": total_queries or 0,
        "successfulQueries": successful_queries,
        "failedQueries": failed_queries or 0,
        "successRate": success_rate,
        "failureReasons": failure_reasons,
        "feedback": {"positive": 0, "negative": 0, "total": 0},
    }
    return {"success": True, "data": data}
