"""Request/response models for the Consultant Learning Loop."""
from enum import Enum

from pydantic import BaseModel, Field


class FeedbackAction(str, Enum):
    ACCEPT = "accept"
    REJECT = "reject"
    MODIFY = "modify"


class FeedbackReason(str, Enum):
    ALREADY_OWNS = "Already owns product"
    BUDGET_CONSTRAINTS = "Budget constraints"
    CUSTOMER_DECLINED = "Customer declined"
    NOT_GOOD_FIT = "Not a good fit"
    OTHER = "Other"


class FeedbackCreate(BaseModel):
    product_name: str
    action: FeedbackAction
    reason: FeedbackReason | None = None
    note: str = Field(default="", description="Free-text detail, e.g. what was modified")


class FeedbackRecord(BaseModel):
    id: str
    analysis_id: str
    product_name: str
    action: FeedbackAction
    reason: str | None
    note: str
    created_at: str


class ProductFeedbackStats(BaseModel):
    product_name: str
    accept_count: int
    reject_count: int
    modify_count: int
    total_count: int
    acceptance_rate: float = Field(..., description="accept_count / total_count, 0 when total_count is 0")
    common_rejection_reasons: list[str] = Field(default_factory=list, description="e.g. 'Already owns product (3)'")


class FeedbackStatsResponse(BaseModel):
    per_product: list[ProductFeedbackStats]
