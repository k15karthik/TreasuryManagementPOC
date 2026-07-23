"""Structured Pydantic outputs produced by each agent in the LangGraph workflow.

Every agent returns one of these objects (via `with_structured_output`) so that
no raw, unstructured paragraphs are ever passed between agents.
"""
from pydantic import BaseModel, Field


class ProfileAnalysis(BaseModel):
    """Output of the Client Profile Agent."""

    industry_assessment: str = Field(..., description="Refined assessment of the client's industry and vertical")
    company_size: str = Field(..., description="Size classification, e.g. Small Business, Middle Market, Corporate")
    growth_stage: str = Field(..., description="e.g. Startup, Growth, Mature, Expansion")
    operational_complexity: int = Field(..., ge=1, le=10, description="1 (simple) to 10 (highly complex) operational complexity score")
    risk_factors: list[str] = Field(default_factory=list, description="Notable risk factors identified")
    business_summary: str = Field(..., description="2-4 sentence executive-style summary of the business")


class IdentifiedNeed(BaseModel):
    need: str = Field(..., description="Short name of the treasury need, e.g. 'High Fraud Risk'")
    severity: int = Field(..., ge=1, le=10, description="1 (low) to 10 (critical) severity")
    evidence: str = Field(..., description="Data points from the client profile supporting this need")


class NeedsAssessment(BaseModel):
    """Output of the Needs Assessment Agent."""

    identified_needs: list[IdentifiedNeed] = Field(default_factory=list)
    summary: str = Field(..., description="Brief synthesis of the client's overall treasury needs")


class Recommendation(BaseModel):
    """A single recommended treasury product."""

    product: str = Field(..., description="Product name, must match a knowledge base product name")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score between 0 and 1")
    reasoning: str = Field(..., description="Why this product fits the client's needs")
    benefits: list[str] = Field(default_factory=list, description="Specific business benefits for this client")
    estimated_roi: str = Field(..., description="Narrative or quantified estimated ROI / business impact")
    addresses_needs: list[str] = Field(default_factory=list, description="Which identified needs this product addresses")


class NotRecommendedProduct(BaseModel):
    product: str = Field(..., description="Product name that was considered but not recommended")
    reason: str = Field(..., description="Why this product was not recommended for this client")


class ProductRecommendations(BaseModel):
    """Output of the Product Recommendation Agent."""

    recommendations: list[Recommendation] = Field(default_factory=list)
    not_recommended: list[NotRecommendedProduct] = Field(default_factory=list)


class ComplianceIssue(BaseModel):
    issue_type: str = Field(..., description="e.g. Duplicate, Business Fit, Conflict, Missing Product, Low Confidence")
    description: str = Field(..., description="Details of the issue")
    severity: str = Field(..., description="Low, Medium, or High")


class ComplianceReport(BaseModel):
    """Output of the Compliance Agent."""

    is_approved: bool = Field(..., description="Whether the recommendation set passes compliance review")
    issues: list[ComplianceIssue] = Field(default_factory=list)
    validated_recommendations: list[str] = Field(default_factory=list, description="Product names that passed review")
    notes: str = Field(..., description="Overall compliance reviewer notes")


class ImplementationPriorityItem(BaseModel):
    product: str
    priority: str = Field(..., description="High, Medium, or Low")
    rationale: str


class CrossSellOpportunity(BaseModel):
    product: str
    rationale: str


class AgendaItem(BaseModel):
    topic: str
    description: str


class ExecutiveSummary(BaseModel):
    """Final output of the Executive Summary Agent — the polished report."""

    client_overview: str = Field(..., description="Executive-level overview of the client business")
    business_needs: str = Field(..., description="Narrative synthesis of identified business needs")
    recommended_products: list[str] = Field(default_factory=list, description="Ordered list of recommended product names")
    business_benefits: str = Field(..., description="Narrative synthesis of business benefits across all recommendations")
    implementation_priority: list[ImplementationPriorityItem] = Field(default_factory=list)
    potential_risks: list[str] = Field(default_factory=list)
    estimated_business_impact: str = Field(..., description="Narrative or quantified estimate of overall business impact")
    next_meeting_agenda: list[AgendaItem] = Field(default_factory=list)
    cross_sell_opportunities: list[CrossSellOpportunity] = Field(default_factory=list)
