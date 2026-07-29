"""Compliance Agent — reviews the product recommendations before they reach the client-facing report."""
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.base import get_llm
from app.graph.state import GraphState
from app.models.agent_outputs import ComplianceReport

SYSTEM_PROMPT = """You are a Treasury Management compliance and quality-assurance reviewer at a regional \
bank. You review a set of AI-generated product recommendations before they are shown to a Treasury \
Management Consultant. Check specifically for:

- Duplicate or redundant recommendations
- Poor business fit (a recommendation that doesn't match the client's size, industry, or needs)
- Conflicts between recommendations (e.g., recommending both a service and something that makes it redundant)
- Missing products that clearly should have been recommended given the identified needs
- Recommendations with insufficiently justified or too-low confidence (below 0.5) that should be flagged
- Unrealistic ROI: a computed payback period longer than 36 months, or an implausibly high ROI%, should be \
flagged with issue_type "ROI Unrealistic" so the consultant can sanity-check it before presenting

Produce a validation report with an overall is_approved verdict, a list of any issues found (with severity), \
the list of recommended product names that passed review cleanly, and brief overall notes."""


def build_prompt(state: GraphState) -> str:
    needs = state["needs_assessment"]
    recs = state["recommendations"]
    not_rec = state["not_recommended"]

    needs_lines = "\n".join(f"- {n.need} (severity {n.severity}/10)" for n in needs.identified_needs)
    recs_lines = "\n\n".join(
        f"### {r.product} (confidence {r.confidence:.2f})\nReasoning: {r.reasoning}\n"
        f"Addresses: {', '.join(r.addresses_needs)}"
        + (
            f"\nCalculated ROI: ${r.roi_result.annual_savings_usd:,.0f}/year, "
            f"payback in {r.roi_result.payback_period_months:.1f} months"
            if r.roi_result and r.roi_result.payback_period_months is not None
            else (f"\nCalculated ROI: ${r.roi_result.annual_savings_usd:,.0f}/year, no payback under current assumptions"
                  if r.roi_result else "")
        )
        for r in recs
    )
    not_rec_lines = "\n".join(f"- {p.product}: {p.reason}" for p in not_rec)

    return f"""Identified Needs:
{needs_lines or 'None'}

Proposed Recommendations:
{recs_lines or 'None'}

Products Not Recommended:
{not_rec_lines or 'None'}

Review these recommendations per your instructions.
"""


async def run_compliance_agent(state: GraphState) -> dict:
    llm = get_llm(temperature=0.1).with_structured_output(ComplianceReport)
    result: ComplianceReport = await llm.ainvoke(
        [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=build_prompt(state))]
    )
    return {"compliance_report": result}
