"""Executive Summary Agent — synthesizes every prior agent's output into a polished, client-ready report."""
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.base import get_llm
from app.graph.state import GraphState
from app.models.agent_outputs import ExecutiveSummary, Recommendation

SYSTEM_PROMPT = """You are a senior Treasury Management Consultant preparing an executive-quality \
recommendation report to present to a client's CFO or Treasurer, and to brief your bank's relationship \
manager beforehand. Synthesize the full analysis into a polished, confident, and specific report with \
these sections: Client Overview, Business Needs, Recommended Products, Business Benefits, Implementation \
Priority (ordered by impact and urgency), Potential Risks, and Estimated Business Impact. Also propose a \
short agenda for the next client meeting, and identify any reasonable cross-sell opportunities beyond the \
core recommendations. Write in clear, professional, executive prose — no jargon without explanation. Only \
include products that passed compliance review in recommended_products.

Cross-sell opportunities must never include a product the client already has (see "Already has these banking \
products" below) or one that's already in recommended_products — a cross-sell suggestion only makes sense for \
something genuinely new to this client.

For every recommended product, explicitly cite its calculated ROI — annual savings and/or cost avoidance, \
payback period, and year-1 ROI percentage — using the real figures provided below, not vague language like \
"significant savings." Do this in each product's Implementation Priority rationale, and roll the headline \
figures into the Business Benefits and Estimated Business Impact narratives too. If a product has no \
calculated figures (only a narrative estimate), summarize that estimate instead — never invent a number."""


def _roi_line(rec: Recommendation) -> str:
    if rec.roi_result:
        roi = rec.roi_result
        payback = (
            f"payback in {roi.payback_period_months:.1f} months"
            if roi.payback_period_months is not None
            else "no payback under current cost assumptions"
        )
        cost_avoidance = f" plus ${roi.cost_avoidance_usd:,.0f}/year in cost avoidance" if roi.cost_avoidance_usd > 0 else ""
        return (
            f"Calculated ROI: ${roi.annual_savings_usd:,.0f}/year in savings{cost_avoidance}, "
            f"{payback}, {roi.roi_percentage_year_1:.0f}% year-1 ROI."
        )
    return f"Estimated ROI (narrative only — no calculated figures available): {rec.estimated_roi}"


def build_prompt(state: GraphState) -> str:
    client = state["client"]
    profile = state["profile_analysis"]
    needs = state["needs_assessment"]
    recs = state["recommendations"]
    compliance = state["compliance_report"]

    needs_lines = "\n".join(f"- {n.need} (severity {n.severity}/10): {n.evidence}" for n in needs.identified_needs)
    recs_lines = "\n\n".join(
        f"### {r.product} (confidence {r.confidence:.2f})\nReasoning: {r.reasoning}\n"
        f"Benefits: {', '.join(r.benefits)}\n{_roi_line(r)}"
        for r in recs
    )

    return f"""Client: {client.company_name} | Industry: {client.industry} | Revenue: ${client.annual_revenue:,.0f}
Business Summary: {profile.business_summary}
Company Size: {profile.company_size} | Growth Stage: {profile.growth_stage}
Operational Complexity: {profile.operational_complexity}/10
Risk Factors: {', '.join(profile.risk_factors) or 'None identified'}
Already has these banking products: {', '.join(client.current_banking_products) or 'None'}

Identified Needs:
{needs_lines or 'None'}

Recommended Products:
{recs_lines or 'None'}

Compliance Review: {'APPROVED' if compliance.is_approved else 'NEEDS ATTENTION'}
Compliance Notes: {compliance.notes}
Validated Products: {', '.join(compliance.validated_recommendations) or 'None'}

Client's Growth Plans: {client.growth_plans or 'Not specified'}

Produce the executive summary report per your instructions.
"""


async def run_executive_agent(state: GraphState) -> dict:
    llm = get_llm(temperature=0.3).with_structured_output(ExecutiveSummary)
    result: ExecutiveSummary = await llm.ainvoke(
        [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=build_prompt(state))]
    )
    return {"executive_summary": result}
