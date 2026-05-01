from datetime import datetime
from typing import Any

from fastapi import APIRouter, Header, Query
from pydantic import BaseModel, Field
from sqlalchemy import and_
from sqlmodel import select

from apps.disambiguation.models import DisambiguationHistory
from common.core.deps import SessionDep


router = APIRouter(tags=["Disambiguation"], prefix="/disambiguation")


class DisambiguationHistoryIn(BaseModel):
    user_id: int | None = Field(default=None, alias="userId")
    org_id: int | None = Field(default=None, alias="orgId")
    question_pattern: str | None = Field(default=None, alias="questionPattern")
    resolution: dict[str, Any] = Field(default_factory=dict)
    source: str | None = None
    context: str | None = None

    model_config = {"populate_by_name": True}


def _resolve_int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _resolve_user_id(explicit_user_id: int | None, header_user_id: str | None) -> int:
    user_id = explicit_user_id or _resolve_int(header_user_id)
    return user_id if user_id is not None else 0


def _serialize(row: DisambiguationHistory) -> dict[str, Any]:
    return {
        "id": row.id,
        "userId": row.user_id,
        "orgId": row.org_id,
        "questionPattern": row.question_pattern,
        "resolution": row.resolution,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "lastUsedAt": row.last_used_at.isoformat() if row.last_used_at else None,
        "useCount": row.use_count,
        "source": row.source,
        "context": row.context,
    }


@router.get("/history")
async def list_history(
        session: SessionDep,
        user_id: int | None = Query(default=None, alias="userId"),
        limit: int = Query(default=20, ge=1, le=100),
        x_de_user_id: str | None = Header(default=None, alias="X-DE-USER-ID"),
):
    resolved_user_id = _resolve_user_id(user_id, x_de_user_id)
    statement = (
        select(DisambiguationHistory)
        .where(DisambiguationHistory.user_id == resolved_user_id)
        .order_by(DisambiguationHistory.last_used_at.desc())
        .limit(limit)
    )
    rows = session.exec(statement).all()
    items = [_serialize(row) for row in rows]
    return {"success": True, "data": items, "items": items}


@router.post("/history")
async def save_history(
        session: SessionDep,
        payload: DisambiguationHistoryIn,
        x_de_user_id: str | None = Header(default=None, alias="X-DE-USER-ID"),
        x_de_org_id: str | None = Header(default=None, alias="X-DE-ORG-ID"),
):
    user_id = _resolve_user_id(payload.user_id, x_de_user_id)
    org_id = payload.org_id or _resolve_int(x_de_org_id)
    question_pattern = (payload.question_pattern or "").strip()
    now = datetime.now()
    statement = select(DisambiguationHistory).where(
        and_(
            DisambiguationHistory.user_id == user_id,
            DisambiguationHistory.question_pattern == question_pattern,
        )
    )
    row = session.exec(statement).first()
    if row:
        row.org_id = org_id
        row.resolution = payload.resolution
        row.last_used_at = now
        row.use_count = (row.use_count or 0) + 1
        row.source = payload.source
        row.context = payload.context
    else:
        row = DisambiguationHistory(
            user_id=user_id,
            org_id=org_id,
            question_pattern=question_pattern,
            resolution=payload.resolution,
            created_at=now,
            last_used_at=now,
            use_count=1,
            source=payload.source,
            context=payload.context,
        )
        session.add(row)
    session.commit()
    session.refresh(row)
    return {"success": True, "data": _serialize(row)}
