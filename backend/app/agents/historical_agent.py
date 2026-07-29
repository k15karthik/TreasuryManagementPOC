"""Historical Client Retrieval — a deterministic (no-LLM) node that finds the most similar
past clients via the historical-analysis RAG and writes them into shared graph state, for the
Product Recommendation Agent to use as supporting evidence. Same non-LLM pattern as
roi_agent.py: not every node in this graph needs to be an LLM call.
"""
import json

from app.database.session import SessionLocal
from app.graph.state import GraphState
from app.knowledge.historical_store import query_similar_analyses
from app.models.agent_outputs import SimilarClient
from app.models.db_models import Analysis, ConsultantFeedback


def _build_query_text(state: GraphState) -> str:
    client = state["client"]
    needs = state.get("needs_assessment")
    needs_text = (
        "; ".join(f"{n.need}: {n.evidence}" for n in needs.identified_needs) if needs else "Not yet assessed"
    )
    return f"""Industry: {client.industry}
Annual Revenue: {client.annual_revenue}
Employee Count: {client.employee_count}
Number of Locations: {client.number_of_locations}
Current Banking Products: {', '.join(client.current_banking_products)}
Current Payment Methods: {', '.join(client.current_payment_methods)}
Monthly ACH Volume: {client.monthly_ach_volume}
Monthly Wire Volume: {client.monthly_wire_volume}
Monthly Check Volume: {client.monthly_check_volume}
Monthly Cash Deposits: {client.monthly_cash_deposits}
Pain Points: {', '.join(client.current_pain_points)}
Fraud History: {client.fraud_history.value}
ERP System: {client.erp_system}
Growth Plans: {client.growth_plans}
Identified Needs: {needs_text}
"""


async def run_historical_agent(state: GraphState) -> dict:
    query_text = _build_query_text(state)
    matches = query_similar_analyses(query_text, n_results=5)
    if not matches:
        return {"similar_clients": []}

    analysis_ids = [m["analysis_id"] for m in matches]

    similar_clients: list[SimilarClient] = []
    with SessionLocal() as db:
        analyses_by_id = {a.id: a for a in db.query(Analysis).filter(Analysis.id.in_(analysis_ids)).all()}

        feedback_rows = (
            db.query(ConsultantFeedback)
            .filter(ConsultantFeedback.analysis_id.in_(analysis_ids))
            .order_by(ConsultantFeedback.created_at)
            .all()
        )
        # Latest action per (analysis_id, product_name) — later rows overwrite earlier ones
        # since feedback_rows is ordered oldest-first, same "most recent wins" convention
        # feedback_service.py already uses.
        latest_feedback: dict[tuple[str, str], str] = {}
        for row in feedback_rows:
            latest_feedback[(row.analysis_id, row.product_name)] = row.action

        for match in matches:
            analysis_id = match["analysis_id"]
            analysis_row = analyses_by_id.get(analysis_id)
            if analysis_row is None:
                continue  # stale Chroma entry pointing at a since-deleted analysis — skip defensively

            recommendations = json.loads(analysis_row.recommendations_json)
            recommended_products = [r["product"] for r in recommendations]

            accepted = [p for p in recommended_products if latest_feedback.get((analysis_id, p)) == "accept"]
            rejected = [p for p in recommended_products if latest_feedback.get((analysis_id, p)) == "reject"]
            reviewed_count = sum(1 for p in recommended_products if (analysis_id, p) in latest_feedback)

            roi_values = [r["roi_result"]["roi_percentage_year_1"] for r in recommendations if r.get("roi_result")]
            roi_summary = (
                f"Average {sum(roi_values) / len(roi_values):.0f}% year-1 ROI across recommended products"
                if roi_values
                else None
            )

            if reviewed_count == 0:
                # Honest scoping: this app only tracks consultant accept/reject, never
                # real-world client adoption, so "outcome" means the former, not the latter.
                outcome_summary = "Not yet reviewed by a consultant"
            else:
                outcome_summary = (
                    f"Consultant reviewed {reviewed_count} of {len(recommended_products)} recommendations; "
                    f"accepted {len(accepted)}"
                )
                if rejected:
                    outcome_summary += f"; rejected {', '.join(rejected)}"

            similar_clients.append(
                SimilarClient(
                    matched_analysis_id=analysis_id,
                    anonymous_id=match["anonymous_id"],
                    industry=match["industry_bucket"],
                    business_size=match["business_size"],
                    growth_stage=match["growth_stage"],
                    similarity_score=match["similarity_score"],
                    recommended_products=recommended_products,
                    consultant_accepted_products=accepted,
                    consultant_rejected_products=rejected,
                    roi_summary=roi_summary,
                    outcome_summary=outcome_summary,
                )
            )

    return {"similar_clients": similar_clients}
