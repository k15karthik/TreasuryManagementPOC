"""Writes to the historical-client RAG system: embedding a just-completed analysis into
institutional memory, and persisting the point-in-time snapshot of similar clients a given
analysis actually saw."""
import json
import logging

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.knowledge.historical_index import build_analysis_document, industry_bucket
from app.knowledge.historical_store import index_historical_analysis
from app.models.agent_outputs import SimilarClient
from app.models.db_models import Analysis, HistoricalEmbedding, SimilarClientMatch

logger = logging.getLogger(__name__)


def next_anonymous_id(db: Session, bucket: str) -> str:
    """Atomically increments the per-bucket counter and returns e.g. 'Manufacturing Client #17'.

    Uses a single INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING statement rather than a
    read-then-write SELECT COUNT(*), since the reindex endpoint runs on a background thread
    (FastAPI BackgroundTasks executes sync functions via run_in_threadpool — a real OS thread)
    genuinely concurrently with live analyses completing on the main thread.
    """
    result = db.execute(
        text(
            """
            INSERT INTO industry_bucket_counters (industry_bucket, next_n)
            VALUES (:bucket, 1)
            ON CONFLICT(industry_bucket) DO UPDATE SET next_n = next_n + 1
            RETURNING next_n
            """
        ),
        {"bucket": bucket},
    )
    n = result.scalar_one()
    db.commit()
    return f"{bucket} Client #{n}"


def index_completed_analysis(analysis: Analysis, dumped: dict, db: Session) -> None:
    """Embeds one completed analysis into the historical-client vector store. Best-effort —
    never raises, since an embedding failure must not break analysis persistence (same
    defensive posture as main.py's seed_knowledge_base() catch). Idempotent: skips analyses
    that already have a HistoricalEmbedding row, so reindex re-runs are safe to repeat.
    """
    try:
        existing = db.query(HistoricalEmbedding).filter(HistoricalEmbedding.analysis_id == analysis.id).first()
        if existing is not None:
            return

        client = dumped.get("client") or {}
        profile = dumped.get("profile_analysis") or {}
        bucket = industry_bucket(client.get("industry", ""))
        anonymous_id = next_anonymous_id(db, bucket)
        document = build_analysis_document(dumped)

        recommended_products = [r.get("product") for r in (dumped.get("recommendations") or []) if r.get("product")]
        recommended_products_json = json.dumps(recommended_products)

        # Chroma metadata values must be flat str/int/float/bool — lists get JSON-encoded.
        metadata = {
            "analysis_id": analysis.id,
            "anonymous_id": anonymous_id,
            "industry_bucket": bucket,
            "business_size": profile.get("company_size", ""),
            "growth_stage": profile.get("growth_stage", ""),
            "recommended_products": recommended_products_json,
        }
        index_historical_analysis(analysis.id, document, metadata)

        db.add(
            HistoricalEmbedding(
                analysis_id=analysis.id,
                anonymous_id=anonymous_id,
                industry_bucket=bucket,
                recommended_products_json=recommended_products_json,
                chroma_document_id=analysis.id,
                embedding_model=settings.openai_embedding_model,
            )
        )
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to index analysis %s into historical RAG", analysis.id)


def persist_similar_client_matches(analysis_id: str, similar_clients: list[SimilarClient], db: Session) -> None:
    """Persists the point-in-time snapshot of what Historical Client Retrieval found for this
    analysis — an audit trail, same append-only reasoning as ConsultantFeedback. Best-effort,
    same defensive posture as index_completed_analysis."""
    if not similar_clients:
        return
    try:
        for rank, sc in enumerate(similar_clients, start=1):
            db.add(
                SimilarClientMatch(
                    analysis_id=analysis_id,
                    rank=rank,
                    matched_analysis_id=sc.matched_analysis_id,
                    anonymous_id=sc.anonymous_id,
                    similarity_score=sc.similarity_score,
                    snapshot_json=sc.model_dump_json(),
                )
            )
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to persist similar-client matches for analysis %s", analysis_id)
