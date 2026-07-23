"""Product Recommendation Agent — retrieves candidate products from the vector knowledge base
and reasons over them with the LLM to produce ranked recommendations, plus an explicit list of
products that were considered but not recommended (and why)."""
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.base import get_llm
from app.graph.state import GraphState
from app.knowledge.loader import load_products
from app.knowledge.vector_store import query_products
from app.models.agent_outputs import ProductRecommendations

SYSTEM_PROMPT = """You are a Treasury Management product specialist at a regional bank. You are given a \
client's business profile, their identified treasury needs, and a candidate list of bank products \
retrieved from the product knowledge base (via semantic search against the client's needs). Your job:

1. Recommend the products from the CANDIDATE LIST that genuinely fit this client's needs. Do not recommend \
   a product the client already has in their "Current Banking Products" list.
2. For every recommendation, give a calibrated confidence score (0-1), clear reasoning tied to specific \
   client needs, concrete business benefits, an estimated ROI (quantify using the client's volumes where \
   possible, otherwise a qualitative estimate), and which identified needs it addresses.
3. For any candidate product you deliberately did NOT recommend, list it under not_recommended with a \
   clear, specific reason (e.g., already in place, insufficient volume to justify cost, doesn't address a \
   real need for this client).

Only choose products that appear in the candidate list — do not invent product names."""


def build_prompt(state: GraphState, candidates: list[dict]) -> str:
    client = state["client"]
    profile = state["profile_analysis"]
    needs = state["needs_assessment"]

    needs_lines = "\n".join(f"- {n.need} (severity {n.severity}/10): {n.evidence}" for n in needs.identified_needs)
    candidates_lines = "\n\n".join(
        f"### {p['name']}\nDescription: {p['description']}\nIdeal Client: {p['ideal_client']}\n"
        f"Benefits: {', '.join(p['benefits'])}\nSolves: {', '.join(p['pain_points_solved'])}"
        for p in candidates
    )

    return f"""Client: {client.company_name} ({client.industry})
Company Size: {profile.company_size} | Growth Stage: {profile.growth_stage}
Already has these banking products: {', '.join(client.current_banking_products) or 'None'}

Identified Needs:
{needs_lines or 'None identified'}

Candidate Products (from knowledge base semantic search):
{candidates_lines}

Produce recommendations and not_recommended lists per your instructions.
"""


async def run_product_agent(state: GraphState) -> dict:
    needs = state["needs_assessment"]

    # Retrieve candidate products per identified need via vector similarity search,
    # deduplicating by product id since multiple needs may surface the same product.
    candidates_by_id: dict[str, dict] = {}
    for need in needs.identified_needs:
        for product in query_products(f"{need.need}: {need.evidence}", n_results=4):
            candidates_by_id[product["id"]] = product

    # Fallback: if no needs were identified or retrieval returned nothing, consider the full catalog.
    if not candidates_by_id:
        candidates_by_id = {p["id"]: p for p in load_products()}

    candidates = list(candidates_by_id.values())

    llm = get_llm(temperature=0.3).with_structured_output(ProductRecommendations)
    result: ProductRecommendations = await llm.ainvoke(
        [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=build_prompt(state, candidates))]
    )
    return {
        "recommendations": result.recommendations,
        "not_recommended": result.not_recommended,
    }
