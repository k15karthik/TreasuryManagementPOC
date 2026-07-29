"""Orchestrates a full LangGraph run as a Server-Sent Events stream, and persists the result.

The frontend needs to see each agent transition Thinking -> Complete in real time, so rather
than awaiting the whole graph and returning one response, we drive the graph with
`astream(..., stream_mode="updates")`, which yields one update per completed node in order for
this linear pipeline. We emit a synthetic "thinking" event immediately before consuming each
node's update, then a "complete" event with that node's structured output right after.
"""
import json
from collections.abc import AsyncGenerator
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.graph.state import GraphState
from app.graph.workflow import NODE_LABELS, NODE_ORDER, workflow
from app.models.client import ClientProfile
from app.models.db_models import Analysis, utc_isoformat
from app.services.historical_service import index_completed_analysis, persist_similar_client_matches


def _sse(event: dict[str, Any]) -> str:
    return f"data: {json.dumps(event, default=str)}\n\n"


def _dump(value: Any) -> Any:
    """Recursively converts Pydantic models (and lists/dicts containing them) into plain JSON-able values."""
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    if isinstance(value, list):
        return [_dump(v) for v in value]
    if isinstance(value, dict):
        return {k: _dump(v) for k, v in value.items()}
    return value


async def run_analysis_stream(client: ClientProfile, db: Session) -> AsyncGenerator[str, None]:
    initial_state: GraphState = {"client": client}
    accumulated: dict[str, Any] = {"client": client}

    try:
        node_stream = workflow.astream(initial_state, stream_mode="updates")

        for node_name in NODE_ORDER:
            yield _sse({"type": "agent_update", "agent": node_name, "label": NODE_LABELS[node_name], "status": "thinking"})

            update = await anext(node_stream)
            node_output = update[node_name]
            accumulated.update(node_output)

            yield _sse(
                {
                    "type": "agent_update",
                    "agent": node_name,
                    "label": NODE_LABELS[node_name],
                    "status": "complete",
                    "output": _dump(node_output),
                }
            )
    except Exception as exc:  # noqa: BLE001 - surface any agent/LLM failure to the UI
        yield _sse({"type": "error", "message": str(exc)})
        return

    analysis = _persist_analysis(client, accumulated, db)

    # Best-effort institutional-memory writes — out-of-band from the Analysis table itself,
    # same reasoning as ConsultantFeedback living separately. Both are wrapped in try/except
    # internally, so a failure here never breaks the analysis that was just persisted.
    dumped_accumulated = _dump(accumulated)
    index_completed_analysis(analysis, dumped_accumulated, db)
    persist_similar_client_matches(analysis.id, accumulated.get("similar_clients", []), db)

    yield _sse(
        {
            "type": "done",
            "analysis_id": analysis.id,
            "created_at": utc_isoformat(analysis.created_at),
            "client": _dump(client),
            "profile_analysis": _dump(accumulated.get("profile_analysis")),
            "needs_assessment": _dump(accumulated.get("needs_assessment")),
            "recommendations": _dump(accumulated.get("recommendations")),
            "not_recommended": _dump(accumulated.get("not_recommended")),
            "compliance_report": _dump(accumulated.get("compliance_report")),
            "executive_summary": _dump(accumulated.get("executive_summary")),
        }
    )


def _persist_analysis(client: ClientProfile, accumulated: dict[str, Any], db: Session) -> Analysis:
    analysis = Analysis(
        company_name=client.company_name,
        industry=client.industry,
        client_json=json.dumps(_dump(client)),
        profile_analysis_json=json.dumps(_dump(accumulated.get("profile_analysis"))),
        needs_assessment_json=json.dumps(_dump(accumulated.get("needs_assessment"))),
        recommendations_json=json.dumps(_dump(accumulated.get("recommendations"))),
        not_recommended_json=json.dumps(_dump(accumulated.get("not_recommended"))),
        compliance_report_json=json.dumps(_dump(accumulated.get("compliance_report"))),
        executive_summary_json=json.dumps(_dump(accumulated.get("executive_summary"))),
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis


def analysis_to_dict(analysis: Analysis) -> dict[str, Any]:
    return {
        "id": analysis.id,
        "created_at": utc_isoformat(analysis.created_at) if isinstance(analysis.created_at, datetime) else analysis.created_at,
        "company_name": analysis.company_name,
        "industry": analysis.industry,
        "client": json.loads(analysis.client_json),
        "profile_analysis": json.loads(analysis.profile_analysis_json),
        "needs_assessment": json.loads(analysis.needs_assessment_json),
        "recommendations": json.loads(analysis.recommendations_json),
        "not_recommended": json.loads(analysis.not_recommended_json),
        "compliance_report": json.loads(analysis.compliance_report_json),
        "executive_summary": json.loads(analysis.executive_summary_json),
    }
