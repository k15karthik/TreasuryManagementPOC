"""Response models for the Similar Client Retrieval / peer benchmark API."""
from pydantic import BaseModel, Field


class BenchmarkStat(BaseModel):
    """Adoption rate for one product across an entire industry-bucket cohort of historical
    analyses — a broader, live-computed aggregate, distinct from the top-5 nearest-neighbor
    SimilarClient matches used as LLM evidence."""

    product_name: str
    percentage: float = Field(..., ge=0, le=100, description="0-100")
    count: int = Field(..., description="Number of cohort analyses that recommended this product")
    cohort_size: int = Field(..., description="Total analyses in this industry bucket considered")


class HistoricalStatus(BaseModel):
    indexed: int
    total_analyses: int
    pending: int
