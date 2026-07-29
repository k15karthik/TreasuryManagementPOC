// TypeScript mirrors of the backend Pydantic models (app/models/*.py).

export type FraudHistory = "None" | "Minor Incident" | "Significant Loss" | "Ongoing Concern";

export interface ClientProfile {
  company_name: string;
  industry: string;
  annual_revenue: number;
  employee_count: number;
  number_of_locations: number;
  current_banking_products: string[];
  current_pain_points: string[];
  erp_system: string;
  current_payment_methods: string[];
  monthly_ach_volume: number;
  monthly_wire_volume: number;
  monthly_check_volume: number;
  monthly_cash_deposits: number;
  fraud_history: FraudHistory;
  growth_plans: string;
}

export interface ProfileAnalysis {
  industry_assessment: string;
  company_size: string;
  growth_stage: string;
  operational_complexity: number;
  risk_factors: string[];
  business_summary: string;
}

export interface IdentifiedNeed {
  need: string;
  severity: number;
  evidence: string;
}

export interface NeedsAssessment {
  identified_needs: IdentifiedNeed[];
  summary: string;
}

export interface ROIAssumptions {
  category: string;
  implementation_cost_usd: number;
  monthly_fee_usd: number;
  labor_rate_per_hour_usd: number;
  manual_check_cost_usd: number;
  fraud_loss_reduction_rate: number;
  annual_interest_rate: number;
  source_note: string;
}

export interface ROIResult {
  product: string;
  category: string;
  monthly_savings_usd: number;
  annual_savings_usd: number;
  cost_avoidance_usd: number;
  implementation_cost_usd: number;
  monthly_cost_usd: number;
  payback_period_months: number | null;
  roi_percentage_year_1: number;
  calculation_steps: string[];
  assumptions: ROIAssumptions;
}

export interface SimilarClient {
  matched_analysis_id: string;
  anonymous_id: string;
  industry: string;
  business_size: string;
  growth_stage: string;
  similarity_score: number;
  recommended_products: string[];
  consultant_accepted_products: string[];
  consultant_rejected_products: string[];
  roi_summary: string | null;
  outcome_summary: string;
}

export interface RecommendationEvidence {
  client_need_evidence: string;
  knowledge_base_evidence: string;
  historical_evidence: string;
  roi_evidence: string | null;
}

export interface BenchmarkStat {
  product_name: string;
  percentage: number;
  count: number;
  cohort_size: number;
}

export interface HistoricalStatus {
  indexed: number;
  total_analyses: number;
  pending: number;
}

export interface Recommendation {
  product: string;
  confidence: number;
  reasoning: string;
  benefits: string[];
  estimated_roi: string;
  addresses_needs: string[];
  // Absent on analyses generated before the ROI engine / Similar Client Retrieval existed —
  // always check for undefined.
  roi_result?: ROIResult;
  evidence?: RecommendationEvidence;
}

export interface NotRecommendedProduct {
  product: string;
  reason: string;
}

export interface ComplianceIssue {
  issue_type: string;
  description: string;
  severity: string;
}

export interface ComplianceReport {
  is_approved: boolean;
  issues: ComplianceIssue[];
  validated_recommendations: string[];
  notes: string;
}

export interface ImplementationPriorityItem {
  product: string;
  priority: string;
  rationale: string;
}

export interface CrossSellOpportunity {
  product: string;
  rationale: string;
}

export interface AgendaItem {
  topic: string;
  description: string;
}

export interface ExecutiveSummary {
  client_overview: string;
  business_needs: string;
  recommended_products: string[];
  business_benefits: string;
  implementation_priority: ImplementationPriorityItem[];
  potential_risks: string[];
  estimated_business_impact: string;
  next_meeting_agenda: AgendaItem[];
  cross_sell_opportunities: CrossSellOpportunity[];
}

export interface AnalysisRecord {
  id: string;
  created_at: string;
  company_name: string;
  industry: string;
  client: ClientProfile;
  profile_analysis: ProfileAnalysis;
  needs_assessment: NeedsAssessment;
  recommendations: Recommendation[];
  not_recommended: NotRecommendedProduct[];
  compliance_report: ComplianceReport;
  executive_summary: ExecutiveSummary;
}

export interface AnalysisListItem {
  id: string;
  created_at: string;
  company_name: string;
  industry: string;
}

export type AgentKey = "profile" | "needs" | "historical" | "product" | "roi" | "compliance" | "executive";
export type AgentStatus = "pending" | "thinking" | "complete";

export interface AgentUpdateEvent {
  type: "agent_update";
  agent: AgentKey;
  label: string;
  status: "thinking" | "complete";
  output?: unknown;
}

export interface DoneEvent {
  type: "done";
  analysis_id: string;
  created_at: string;
  client: ClientProfile;
  profile_analysis: ProfileAnalysis;
  needs_assessment: NeedsAssessment;
  recommendations: Recommendation[];
  not_recommended: NotRecommendedProduct[];
  compliance_report: ComplianceReport;
  executive_summary: ExecutiveSummary;
}

export interface ErrorEvent {
  type: "error";
  message: string;
}

export type WorkflowEvent = AgentUpdateEvent | DoneEvent | ErrorEvent;

export type FeedbackAction = "accept" | "reject" | "modify";

export type FeedbackReason =
  | "Already owns product"
  | "Budget constraints"
  | "Customer declined"
  | "Not a good fit"
  | "Other";

export interface FeedbackRecord {
  id: string;
  analysis_id: string;
  product_name: string;
  action: FeedbackAction;
  reason: string | null;
  note: string;
  created_at: string;
}

export interface ProductFeedbackStats {
  product_name: string;
  accept_count: number;
  reject_count: number;
  modify_count: number;
  total_count: number;
  acceptance_rate: number;
  common_rejection_reasons: string[];
}

export interface FeedbackStatsResponse {
  per_product: ProductFeedbackStats[];
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  ideal_client: string;
  benefits: string[];
  requirements: string[];
  pain_points_solved: string[];
  keywords: string[];
}
