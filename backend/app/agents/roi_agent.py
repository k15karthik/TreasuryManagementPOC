"""ROI Calculation Engine node — enriches each recommendation with a deterministically
computed ROIResult. Unlike every other node in this package, this makes no LLM call."""
from app.graph.state import GraphState
from app.services.roi_engine import compute_roi_for_recommendation


async def run_roi_agent(state: GraphState) -> dict:
    client = state["client"]
    recommendations = state["recommendations"]

    enriched = [
        rec.model_copy(update={"roi_result": compute_roi_for_recommendation(rec.product, client)})
        for rec in recommendations
    ]
    return {"recommendations": enriched}
