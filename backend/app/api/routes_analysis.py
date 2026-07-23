"""Routes that drive and persist the LangGraph multi-agent analysis workflow."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.client import ClientProfile
from app.models.db_models import Analysis, utc_isoformat
from app.services.analysis_service import analysis_to_dict, run_analysis_stream

router = APIRouter(prefix="/api/analyses", tags=["analysis"])


@router.post("")
async def start_analysis(client: ClientProfile, db: Session = Depends(get_db)) -> StreamingResponse:
    """Runs the full 5-agent workflow and streams progress back as Server-Sent Events."""
    return StreamingResponse(
        run_analysis_stream(client, db),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("")
async def list_analyses(db: Session = Depends(get_db)) -> list[dict]:
    rows = db.query(Analysis).order_by(desc(Analysis.created_at)).all()
    return [
        {
            "id": row.id,
            "created_at": utc_isoformat(row.created_at),
            "company_name": row.company_name,
            "industry": row.industry,
        }
        for row in rows
    ]


@router.get("/{analysis_id}")
async def get_analysis(analysis_id: str, db: Session = Depends(get_db)) -> dict:
    row = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis_to_dict(row)
