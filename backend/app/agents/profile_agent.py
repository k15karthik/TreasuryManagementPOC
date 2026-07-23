"""Client Profile Agent — analyzes the raw intake data into a structured business profile."""
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.base import get_llm
from app.graph.state import GraphState
from app.models.agent_outputs import ProfileAnalysis
from app.models.client import ClientProfile

SYSTEM_PROMPT = """You are a senior Treasury Management Consultant at a regional bank, specializing in \
business profiling. Given a client's intake data, produce a precise, structured analysis of the business: \
its industry positioning, size classification, growth stage, operational complexity, and key risk factors. \
Be specific and grounded in the data provided — do not invent facts. Write the business_summary in a \
polished, executive tone suitable for a bank relationship manager."""


def build_prompt(client: ClientProfile) -> str:
    return f"""Analyze the following business for a treasury management engagement:

Company Name: {client.company_name}
Industry: {client.industry}
Annual Revenue: ${client.annual_revenue:,.0f}
Employee Count: {client.employee_count}
Number of Locations: {client.number_of_locations}
Current Banking Products: {', '.join(client.current_banking_products) or 'None reported'}
Current Pain Points: {', '.join(client.current_pain_points) or 'None reported'}
ERP System: {client.erp_system or 'Not specified'}
Current Payment Methods: {', '.join(client.current_payment_methods) or 'Not specified'}
Monthly ACH Volume: ${client.monthly_ach_volume:,.0f}
Monthly Wire Volume: ${client.monthly_wire_volume:,.0f}
Monthly Check Volume: ${client.monthly_check_volume:,.0f}
Monthly Cash Deposits: ${client.monthly_cash_deposits:,.0f}
Fraud History: {client.fraud_history.value}
Growth Plans: {client.growth_plans or 'Not specified'}
"""


async def run_profile_agent(state: GraphState) -> dict:
    client = state["client"]
    llm = get_llm(temperature=0.2).with_structured_output(ProfileAnalysis)
    result: ProfileAnalysis = await llm.ainvoke(
        [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=build_prompt(client))]
    )
    return {"profile_analysis": result}
