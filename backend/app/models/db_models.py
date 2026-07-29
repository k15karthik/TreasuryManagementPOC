"""SQLAlchemy ORM models for persisted analyses."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
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


class ConsultantFeedback(Base):
    """One consultant action (accept/reject/modify) on one recommended product.

    Rows are an append-only audit trail, not an upsert — a consultant can change
    their mind on a product; "current" status is whichever row is most recent.
    `analysis_id` documents the relationship via a ForeignKey but it is NOT
    enforced by SQLite (which only checks FKs when PRAGMA foreign_keys=ON is set
    per-connection, and this engine doesn't set it) — existence is validated at
    the route layer instead, so this table needs no migration story of its own.
    """

    __tablename__ = "consultant_feedback"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    analysis_id: Mapped[str] = mapped_column(String, ForeignKey("analyses.id"), index=True)
    product_name: Mapped[str] = mapped_column(String, index=True)
    action: Mapped[str] = mapped_column(String)  # "accept" | "reject" | "modify"
    reason: Mapped[str] = mapped_column(String, default="")
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class HistoricalEmbedding(Base):
    """Tracks that one Analysis has been embedded into the historical-client vector store,
    plus the anonymized identity assigned to it. The vector itself lives in Chroma
    (`historical_analyses` collection) — this table is the SQL system of record: it's what
    a future Postgres+pgvector migration would carry over, and what a reindex rebuilds from.

    `recommended_products_json` is a deliberate denormalized cache of that analysis's
    recommended product names, so peer-benchmark aggregation across potentially thousands
    of rows never has to json.loads() every full Analysis.recommendations_json blob just to
    extract product names.
    """

    __tablename__ = "historical_embeddings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    analysis_id: Mapped[str] = mapped_column(String, ForeignKey("analyses.id"), unique=True, index=True)
    anonymous_id: Mapped[str] = mapped_column(String)
    industry_bucket: Mapped[str] = mapped_column(String, index=True)
    recommended_products_json: Mapped[str] = mapped_column(Text, default="[]")
    chroma_document_id: Mapped[str] = mapped_column(String)
    embedding_model: Mapped[str] = mapped_column(String)
    indexed_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class SimilarClientMatch(Base):
    """One row per (analysis, matched historical peer) pair — a point-in-time snapshot of
    exactly what Historical Client Retrieval found and showed to the Product Recommendation
    Agent when this analysis ran. Snapshotted (not recomputed on read) for the same audit-trail
    reasoning ConsultantFeedback already uses: what a consultant sees shouldn't silently drift
    if the matched historical analysis's own feedback/ROI changes later.
    """

    __tablename__ = "similar_client_matches"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    analysis_id: Mapped[str] = mapped_column(String, ForeignKey("analyses.id"), index=True)
    rank: Mapped[int] = mapped_column(Integer)
    matched_analysis_id: Mapped[str] = mapped_column(String, ForeignKey("analyses.id"))
    anonymous_id: Mapped[str] = mapped_column(String)
    similarity_score: Mapped[float] = mapped_column(Float)
    snapshot_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class IndustryBucketCounter(Base):
    """Atomic per-bucket counter backing anonymous IDs like 'Manufacturing Client #17'.
    Incremented via a single INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING statement
    (see historical_service.next_anonymous_id) rather than a read-then-write SELECT COUNT(*),
    since the reindex endpoint runs on a background thread genuinely concurrently with live
    analyses completing on the main thread.
    """

    __tablename__ = "industry_bucket_counters"

    industry_bucket: Mapped[str] = mapped_column(String, primary_key=True)
    next_n: Mapped[int] = mapped_column(Integer, default=0)
