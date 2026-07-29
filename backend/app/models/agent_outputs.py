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


class ROIAssumptions(BaseModel):
    """The inputs used to compute an ROIResult, kept separate from the calculated numbers
    so a consultant can see exactly what was assumed vs. what was calculated."""

    category: str = Field(..., description="Product category these assumptions apply to")
    implementation_cost_usd: float = Field(..., description="One-time estimated implementation cost")
    monthly_fee_usd: float = Field(..., description="Estimated ongoing monthly fee for the product")
    labor_rate_per_hour_usd: float = Field(default=35.0, description="Assumed fully-loaded labor cost per hour")
    manual_check_cost_usd: float = Field(default=0.0, description="Assumed cost to process one check manually")
    fraud_loss_reduction_rate: float = Field(default=0.0, ge=0, le=1, description="Assumed fraction of fraud losses avoided (Fraud Prevention only)")
    annual_interest_rate: float = Field(default=0.0, ge=0, le=1, description="Assumed annual yield/interest rate (Liquidity Management only)")
    source_note: str = Field(..., description="Plain-language note on where these assumptions come from and their limits")


class ROIResult(BaseModel):
    """Deterministically calculated ROI for one recommended product — computed in Python
    from the client's actual volumes, not produced by the LLM."""

    product: str
    category: str
    monthly_savings_usd: float
    annual_savings_usd: float
    cost_avoidance_usd: float = Field(default=0.0, description="Separate from savings — e.g. avoided fraud losses")
    implementation_cost_usd: float
    monthly_cost_usd: float
    payback_period_months: float | None = Field(default=None, description="None when savings don't cover the cost")
    roi_percentage_year_1: float
    calculation_steps: list[str] = Field(default_factory=list, description="Human-readable arithmetic trace")
    assumptions: ROIAssumptions


class SimilarClient(BaseModel):
    """One historically similar past client, surfaced as supporting evidence for the
    Product Recommendation Agent and for the report's "Similar Clients" section.
    Deterministically assembled from Chroma + SQL joins — never LLM-produced, and never
    carries any client-identifying information (anonymous_id is a bucket-scoped counter)."""

    matched_analysis_id: str = Field(..., description="Internal analysis UUID — opaque, not client-identifying, used only for persistence joins")
    anonymous_id: str = Field(..., description="e.g. 'Manufacturing Client #17' — never a real company name")
    industry: str = Field(..., description="Industry bucket label, e.g. 'Manufacturing'")
    business_size: str
    growth_stage: str
    similarity_score: float = Field(..., ge=0, le=1, description="0-1 cosine similarity to the current client")
    recommended_products: list[str] = Field(default_factory=list)
    consultant_accepted_products: list[str] = Field(default_factory=list)
    consultant_rejected_products: list[str] = Field(default_factory=list)
    roi_summary: str | None = Field(default=None, description="e.g. 'Average 143% year-1 ROI across recommended products'")
    outcome_summary: str = Field(..., description="Consultant acceptance outcome — not real-world adoption data, which this app doesn't track")


class RecommendationEvidence(BaseModel):
    """The explainability breakdown behind one recommendation: four independent strands
    of evidence, populated by whoever actually has that data at their point in the pipeline."""

    client_need_evidence: str = Field(..., description="Which specific client needs this product addresses, and why")
    knowledge_base_evidence: str = Field(..., description="Why this product fits per the treasury product catalog")
    historical_evidence: str = Field(..., description="What similar past clients suggest — or an honest 'none found' statement")
    roi_evidence: str | None = Field(default=None, description="Filled in by the ROI engine after this is first created; None until then")


class Recommendation(BaseModel):
    """A single recommended treasury product."""

    product: str = Field(..., description="Product name, must match a knowledge base product name")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score between 0 and 1")
    reasoning: str = Field(..., description="Why this product fits the client's needs")
    benefits: list[str] = Field(default_factory=list, description="Specific business benefits for this client")
    estimated_roi: str = Field(..., description="Narrative or quantified estimated ROI / business impact")
    addresses_needs: list[str] = Field(default_factory=list, description="Which identified needs this product addresses")
    roi_result: ROIResult | None = Field(default=None, description="Deterministically computed ROI; absent on analyses run before the ROI engine existed")
    evidence: RecommendationEvidence | None = Field(default=None, description="4-strand explainability breakdown; absent on analyses run before this existed")


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
