"""Needs Assessment Agent — translates the business profile into concrete treasury needs."""
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.base import get_llm
from app.graph.state import GraphState
from app.models.agent_outputs import NeedsAssessment

SYSTEM_PROMPT = """You are a Treasury Management needs-assessment specialist. Given a client's raw intake \
data and a business profile analysis, identify the client's concrete treasury management needs. Use \
standard treasury need categories where applicable, such as: High Fraud Risk, Liquidity Issues, Manual \
Payments, Slow Collections, Too Many Checks, Cash Heavy Business, Multi-location Banking, Payroll \
Complexity. You may also identify other needs not in that list if clearly evidenced by the data. For each \
need, cite the specific evidence from the client's data and assign a severity from 1-10."""


def build_prompt(state: GraphState) -> str:
    client = state["client"]
    profile = state["profile_analysis"]
    return f"""Client raw data:
Company: {client.company_name} | Industry: {client.industry} | Revenue: ${client.annual_revenue:,.0f}
Employees: {client.employee_count} | Locations: {client.number_of_locations}
Current Products: {', '.join(client.current_banking_products) or 'None'}
Pain Points (client-reported): {', '.join(client.current_pain_points) or 'None reported'}
Payment Methods: {', '.join(client.current_payment_methods) or 'Not specified'}
Monthly ACH: ${client.monthly_ach_volume:,.0f} | Monthly Wire: ${client.monthly_wire_volume:,.0f}
Monthly Check: ${client.monthly_check_volume:,.0f} | Monthly Cash Deposits: ${client.monthly_cash_deposits:,.0f}
Fraud History: {client.fraud_history.value}
Growth Plans: {client.growth_plans or 'Not specified'}

Business Profile Analysis:
Company Size: {profile.company_size}
Growth Stage: {profile.growth_stage}
Operational Complexity: {profile.operational_complexity}/10
Risk Factors: {', '.join(profile.risk_factors) or 'None identified'}
Summary: {profile.business_summary}

Identify this client's treasury management needs.
"""


async def run_needs_agent(state: GraphState) -> dict:
    llm = get_llm(temperature=0.2).with_structured_output(NeedsAssessment)
    result: NeedsAssessment = await llm.ainvoke(
        [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=build_prompt(state))]
    )
    return {"needs_assessment": result}
