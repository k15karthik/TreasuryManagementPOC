"""Aggregation logic for the Consultant Learning Loop — the single source of truth for
"acceptance rate" style stats, used by both the feedback API route and the Product
Recommendation Agent's prompt builder."""
from collections import defaultdict

from sqlalchemy.orm import Session

from app.models.db_models import ConsultantFeedback
from app.models.feedback import ProductFeedbackStats


def get_feedback_stats(db: Session, product_names: list[str] | None = None) -> list[ProductFeedbackStats]:
    """Aggregate feedback across all analyses, optionally scoped to a candidate set of
    product names. Returns an empty list immediately for an empty (not None) filter,
    since that means the caller has no candidates to look up."""
    if product_names is not None and not product_names:
        return []

    query = db.query(ConsultantFeedback)
    if product_names is not None:
        query = query.filter(ConsultantFeedback.product_name.in_(product_names))
    rows = query.all()

    by_product: dict[str, list[ConsultantFeedback]] = defaultdict(list)
    for row in rows:
        by_product[row.product_name].append(row)

    stats: list[ProductFeedbackStats] = []
    for product_name, feedback_rows in by_product.items():
        accept = sum(1 for r in feedback_rows if r.action == "accept")
        reject = sum(1 for r in feedback_rows if r.action == "reject")
        modify = sum(1 for r in feedback_rows if r.action == "modify")
        total = len(feedback_rows)

        reason_counts: dict[str, int] = defaultdict(int)
        for r in feedback_rows:
            if r.action == "reject" and r.reason:
                reason_counts[r.reason] += 1
        common_reasons = [
            f"{reason} ({count})" for reason, count in sorted(reason_counts.items(), key=lambda kv: -kv[1])[:3]
        ]

        stats.append(
            ProductFeedbackStats(
                product_name=product_name,
                accept_count=accept,
                reject_count=reject,
                modify_count=modify,
                total_count=total,
                acceptance_rate=round(accept / total, 2) if total else 0.0,
                common_rejection_reasons=common_reasons,
            )
        )
    return stats


def build_feedback_context(db: Session, product_names: list[str]) -> str:
    """Short prompt-injection block summarizing historical consultant feedback for this
    run's candidate products. Returns "" (not a hollow header) when there's nothing yet."""
    stats = [s for s in get_feedback_stats(db, product_names) if s.total_count > 0]
    if not stats:
        return ""

    lines = []
    for s in stats:
        if s.reject_count > 0:
            reasons = ", ".join(s.common_rejection_reasons)
            suffix = f" Common reasons: {reasons}." if reasons else ""
            lines.append(f"- {s.product_name}: rejected {s.reject_count}/{s.total_count} times historically.{suffix}")
        else:
            lines.append(f"- {s.product_name}: accepted {s.accept_count}/{s.total_count} times historically.")

    return "Consultant Feedback History (from past analyses):\n" + "\n".join(lines)
