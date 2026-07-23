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

export interface Recommendation {
  product: string;
  confidence: number;
  reasoning: string;
  benefits: string[];
  estimated_roi: string;
  addresses_needs: string[];
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

export type AgentKey = "profile" | "needs" | "product" | "compliance" | "executive";
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
