"""Peer-benchmark aggregation — a live, broader query across an entire industry-bucket cohort
of historical analyses (e.g. "87% of similar Manufacturing clients use Positive Pay"),
deliberately distinct from the point-in-time top-5 SimilarClientMatch snapshots used as LLM
evidence. This will naturally shift as more analyses accumulate, which is correct — unlike
SimilarClientMatch, nothing here is meant to be a frozen audit trail.
"""
import json
from collections import defaultdict

from sqlalchemy.orm import Session

from app.models.db_models import HistoricalEmbedding
from app.models.historical import BenchmarkStat

MIN_COHORT_SIZE = 3


def compute_benchmarks(db: Session, bucket: str, product_names: list[str]) -> list[BenchmarkStat]:
    """Returns [] when the cohort is smaller than MIN_COHORT_SIZE — "100% of 1 client" is not
    a meaningful benchmark and must never render."""
    if not product_names:
        return []

    rows = db.query(HistoricalEmbedding).filter(HistoricalEmbedding.industry_bucket == bucket).all()
    cohort_size = len(rows)
    if cohort_size < MIN_COHORT_SIZE:
        return []

    counts: dict[str, int] = defaultdict(int)
    for row in rows:
        for product in json.loads(row.recommended_products_json or "[]"):
            counts[product] += 1

    return [
        BenchmarkStat(
            product_name=product_name,
            percentage=round((counts.get(product_name, 0) / cohort_size) * 100, 1),
            count=counts.get(product_name, 0),
            cohort_size=cohort_size,
        )
        for product_name in product_names
    ]
