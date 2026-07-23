"""LangGraph StateGraph wiring the 5-agent Treasury Management Copilot workflow.

Pipeline:  Client -> Profile Agent -> Needs Agent -> Product Agent -> Compliance Agent -> Executive Report
"""
from langgraph.graph import END, StateGraph

from app.agents.compliance_agent import run_compliance_agent
from app.agents.executive_agent import run_executive_agent
from app.agents.needs_agent import run_needs_agent
from app.agents.product_agent import run_product_agent
from app.agents.profile_agent import run_profile_agent
from app.graph.state import GraphState

# Node names in execution order — used both to build the graph and to drive
# the SSE progress stream in analysis_service.py.
NODE_ORDER = ["profile", "needs", "product", "compliance", "executive"]

NODE_LABELS = {
    "profile": "Client Profile Agent",
    "needs": "Needs Assessment Agent",
    "product": "Product Recommendation Agent",
    "compliance": "Compliance Agent",
    "executive": "Executive Summary Agent",
}


def build_workflow():
    graph = StateGraph(GraphState)

    graph.add_node("profile", run_profile_agent)
    graph.add_node("needs", run_needs_agent)
    graph.add_node("product", run_product_agent)
    graph.add_node("compliance", run_compliance_agent)
    graph.add_node("executive", run_executive_agent)

    graph.set_entry_point("profile")
    graph.add_edge("profile", "needs")
    graph.add_edge("needs", "product")
    graph.add_edge("product", "compliance")
    graph.add_edge("compliance", "executive")
    graph.add_edge("executive", END)

    return graph.compile()


workflow = build_workflow()
