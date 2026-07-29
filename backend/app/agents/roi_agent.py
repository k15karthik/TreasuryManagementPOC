"""ROI Calculation Engine node — enriches each recommendation with a deterministically
computed ROIResult, and fills in the `roi_evidence` strand of its explainability breakdown.
Unlike every other node in this package, this makes no LLM call."""
from app.graph.state import GraphState
from app.models.agent_outputs import RecommendationEvidence
from app.services.roi_engine import compute_roi_for_recommendation


def _build_roi_evidence_text(roi_result) -> str:
    if roi_result.payback_period_months is not None:
        return (
            f"Estimated {roi_result.annual_savings_usd:,.0f}/year, "
            f"payback in {roi_result.payback_period_months:.1f} months "
            f"({roi_result.roi_percentage_year_1:.0f}% year-1 ROI)."
        )
    return (
        f"Estimated {roi_result.annual_savings_usd:,.0f}/year in savings, "
        f"but no payback under current cost assumptions ({roi_result.roi_percentage_year_1:.0f}% year-1 ROI)."
    )


async def run_roi_agent(state: GraphState) -> dict:
    client = state["client"]
    recommendations = state["recommendations"]

    enriched = []
    for rec in recommendations:
        roi_result = compute_roi_for_recommendation(rec.product, client)
        roi_evidence_text = _build_roi_evidence_text(roi_result)

        # The LLM may have left `evidence` entirely None (e.g. on a model that didn't
        # populate it) — construct a placeholder rather than crash on model_copy of None.
        base_evidence = rec.evidence or RecommendationEvidence(
            client_need_evidence="Not provided.",
            knowledge_base_evidence="Not provided.",
            historical_evidence="Not provided.",
        )
        new_evidence = base_evidence.model_copy(update={"roi_evidence": roi_evidence_text})

        enriched.append(rec.model_copy(update={"roi_result": roi_result, "evidence": new_evidence}))

    return {"recommendations": enriched}
