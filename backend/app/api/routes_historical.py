"""Routes for the Similar Client Retrieval / historical RAG system: reading a specific
analysis's similar-client matches and peer benchmarks, and (re)indexing historical analyses
into the bank's institutional-memory search. Kept as its own router/file/prefix rather than
bolted onto routes_analysis.py, mirroring how routes_feedback.py already does the same for
feedback despite also being "about" an analysis.
"""
import json
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import SessionLocal, get_db
from app.knowledge.historical_index import industry_bucket
from app.models.agent_outputs import SimilarClient
from app.models.db_models import Analysis, HistoricalEmbedding, SimilarClientMatch
from app.models.historical import BenchmarkStat, HistoricalStatus
from app.services.analysis_service import analysis_to_dict
from app.services.benchmark_service import compute_benchmarks
from app.services.historical_service import index_completed_analysis

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/historical", tags=["historical"])


def _get_analysis_or_404(db: Session, analysis_id: str) -> Analysis:
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis


@router.get("/analyses/{analysis_id}/similar-clients")
async def get_similar_clients(analysis_id: str, db: Session = Depends(get_db)) -> list[SimilarClient]:
    """Returns the point-in-time snapshot of similar clients found when this analysis ran
    (not recomputed live) — 200 [] if the analysis exists but had no peers at the time."""
    _get_analysis_or_404(db, analysis_id)
    rows = (
        db.query(SimilarClientMatch)
        .filter(SimilarClientMatch.analysis_id == analysis_id)
        .order_by(SimilarClientMatch.rank)
        .all()
    )
    return [SimilarClient.model_validate_json(row.snapshot_json) for row in rows]


@router.get("/analyses/{analysis_id}/benchmarks")
async def get_benchmarks(analysis_id: str, db: Session = Depends(get_db)) -> list[BenchmarkStat]:
    """Live-computed adoption rate across the analysis's whole industry-bucket cohort —
    unlike similar-clients, this is recomputed fresh and will change as the cohort grows."""
    analysis = _get_analysis_or_404(db, analysis_id)
    recommendations = json.loads(analysis.recommendations_json)
    product_names = [r["product"] for r in recommendations]
    bucket = industry_bucket(analysis.industry)
    return compute_benchmarks(db, bucket, product_names)


@router.get("/status")
async def get_status(db: Session = Depends(get_db)) -> HistoricalStatus:
    total = db.query(Analysis).count()
    indexed = db.query(HistoricalEmbedding).count()
    return HistoricalStatus(indexed=indexed, total_analyses=total, pending=total - indexed)


def _reindex_all() -> None:
    """Runs on a background thread via FastAPI BackgroundTasks — opens its own DB session
    since the request-scoped one from `get_db` isn't safe to use outside the request/thread
    that created it. Each row gets its own try/except so one bad row can't abort the batch."""
    with SessionLocal() as db:
        pending = (
            db.query(Analysis)
            .outerjoin(HistoricalEmbedding, HistoricalEmbedding.analysis_id == Analysis.id)
            .filter(HistoricalEmbedding.id.is_(None))
            .all()
        )
        for analysis in pending:
            try:
                index_completed_analysis(analysis, analysis_to_dict(analysis), db)
            except Exception:
                logger.exception("Reindex failed for analysis %s", analysis.id)


@router.post("/reindex")
async def reindex(background_tasks: BackgroundTasks, db: Session = Depends(get_db)) -> dict:
    """Bootstraps embeddings for analyses that predate this feature (or were never indexed
    for any reason). Fire-and-forget: counts un-indexed rows synchronously so the response is
    accurate, then dispatches the actual embedding work to a background task so the request
    doesn't block on a potentially long batch of OpenAI calls. Idempotent — re-posting after
    a batch completes returns count: 0."""
    total = db.query(Analysis).count()
    indexed = db.query(HistoricalEmbedding).count()
    background_tasks.add_task(_reindex_all)
    return {"status": "started", "count": total - indexed}
