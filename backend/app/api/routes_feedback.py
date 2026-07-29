"""Routes for the Consultant Learning Loop: submitting Accept/Reject/Modify feedback
on recommendations, and reading it back (per-analysis audit trail, or aggregate stats)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.db_models import Analysis, ConsultantFeedback, utc_isoformat
from app.models.feedback import FeedbackCreate, FeedbackRecord, FeedbackStatsResponse
from app.services.feedback_service import get_feedback_stats

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


def _to_record(row: ConsultantFeedback) -> FeedbackRecord:
    return FeedbackRecord(
        id=row.id,
        analysis_id=row.analysis_id,
        product_name=row.product_name,
        action=row.action,
        reason=row.reason or None,
        note=row.note,
        created_at=utc_isoformat(row.created_at),
    )


@router.post("/analyses/{analysis_id}")
async def submit_feedback(analysis_id: str, payload: FeedbackCreate, db: Session = Depends(get_db)) -> FeedbackRecord:
    """Records one consultant action on a recommendation. Rows are append-only —
    submitting again for the same product just adds a new "current" status."""
    if db.query(Analysis).filter(Analysis.id == analysis_id).first() is None:
        raise HTTPException(status_code=404, detail="Analysis not found")

    row = ConsultantFeedback(
        analysis_id=analysis_id,
        product_name=payload.product_name,
        action=payload.action.value,
        reason=payload.reason.value if payload.reason else "",
        note=payload.note,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_record(row)


@router.get("/analyses/{analysis_id}")
async def list_feedback(analysis_id: str, db: Session = Depends(get_db)) -> list[FeedbackRecord]:
    """Full feedback audit trail for one analysis, oldest first."""
    rows = (
        db.query(ConsultantFeedback)
        .filter(ConsultantFeedback.analysis_id == analysis_id)
        .order_by(ConsultantFeedback.created_at)
        .all()
    )
    return [_to_record(r) for r in rows]


@router.get("/stats")
async def feedback_stats(product_name: str | None = None, db: Session = Depends(get_db)) -> FeedbackStatsResponse:
    """Aggregate acceptance-rate stats across every analysis, optionally scoped to one product."""
    names = [product_name] if product_name else None
    return FeedbackStatsResponse(per_product=get_feedback_stats(db, names))
