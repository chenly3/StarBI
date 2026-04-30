from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Column, DateTime, Identity, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class DisambiguationHistory(SQLModel, table=True):
    __tablename__ = "ai_query_disambiguation_history"

    id: Optional[int] = Field(sa_column=Column(BigInteger, Identity(always=True), primary_key=True))
    user_id: int = Field(sa_column=Column(BigInteger, nullable=False, index=True))
    org_id: Optional[int] = Field(sa_column=Column(BigInteger, nullable=True, index=True))
    question_pattern: str = Field(sa_column=Column(String(500), nullable=False, index=True))
    resolution: dict = Field(sa_column=Column(JSONB, nullable=False))
    created_at: datetime = Field(sa_column=Column(DateTime(timezone=False), nullable=False))
    last_used_at: datetime = Field(sa_column=Column(DateTime(timezone=False), nullable=False))
    use_count: int = Field(sa_column=Column(Integer, nullable=False, default=1))
    source: Optional[str] = Field(sa_column=Column(String(64), nullable=True))
    context: Optional[str] = Field(sa_column=Column(Text, nullable=True))
