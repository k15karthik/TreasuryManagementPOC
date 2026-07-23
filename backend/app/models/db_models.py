"""SQLAlchemy ORM models for persisted analyses."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


def utc_isoformat(dt: datetime) -> str:
    """SQLite drops tzinfo on round-trip, so `dt` may come back naive even though
    `_now()` always wrote it in UTC. Reattach UTC before formatting so the ISO string
    carries an explicit offset for clients to convert correctly."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


class Analysis(Base):
    """One completed end-to-end LangGraph run for a client."""

    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    company_name: Mapped[str] = mapped_column(String)
    industry: Mapped[str] = mapped_column(String)

    client_json: Mapped[str] = mapped_column(Text)
    profile_analysis_json: Mapped[str] = mapped_column(Text)
    needs_assessment_json: Mapped[str] = mapped_column(Text)
    recommendations_json: Mapped[str] = mapped_column(Text)
    not_recommended_json: Mapped[str] = mapped_column(Text)
    compliance_report_json: Mapped[str] = mapped_column(Text)
    executive_summary_json: Mapped[str] = mapped_column(Text)
