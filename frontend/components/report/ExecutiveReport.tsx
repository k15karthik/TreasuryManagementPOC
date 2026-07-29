import { AlertTriangle, Building2, CheckCircle2, DollarSign, ListChecks, ShieldAlert, Sparkles } from "lucide-react";

import type {
  ClientProfile,
  ComplianceReport,
  NeedsAssessment,
  NotRecommendedProduct,
  ProfileAnalysis,
  Recommendation,
  ExecutiveSummary as ExecutiveSummaryType,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RiskMeter } from "./RiskMeter";
import { ComplexityMeter } from "./ComplexityMeter";
import { RecommendationFeedbackList } from "./RecommendationFeedbackList";
import { SimilarClientsCard } from "./SimilarClientsCard";
import { NotRecommendedList } from "./NotRecommendedList";
import { NextMeetingAgenda } from "./NextMeetingAgenda";

export interface ExecutiveReportProps {
  analysisId: string;
  client: ClientProfile;
  profileAnalysis: ProfileAnalysis;
  needsAssessment: NeedsAssessment;
  recommendations: Recommendation[];
  notRecommended: NotRecommendedProduct[];
  complianceReport: ComplianceReport;
  executiveSummary: ExecutiveSummaryType;
}

const PRIORITY_VARIANT: Record<string, "destructive" | "warning" | "success"> = {
  High: "destructive",
  Medium: "warning",
  Low: "success",
};

export function ExecutiveReport({
  analysisId,
  client,
  profileAnalysis,
  needsAssessment,
  recommendations,
  notRecommended,
  complianceReport,
  executiveSummary,
}: ExecutiveReportProps) {
  const riskScore = Math.min(10, profileAnalysis.risk_factors.length * 2 + (client.fraud_history !== "None" ? 3 : 0));

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-gradient-to-br from-accent/60 to-transparent">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <Badge variant="accent" className="mb-2">
              Executive Recommendation Report
            </Badge>
            <CardTitle className="text-xl">{client.company_name}</CardTitle>
            <CardDescription>
              {client.industry} · {profileAnalysis.company_size} · {profileAnalysis.growth_stage}
            </CardDescription>
          </div>
          <Badge variant={complianceReport.is_approved ? "success" : "warning"} className="gap-1">
            {complianceReport.is_approved ? <CheckCircle2 className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
            {complianceReport.is_approved ? "Compliance Approved" : "Needs Attention"}
          </Badge>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <RiskMeter score={riskScore} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <ComplexityMeter score={profileAnalysis.operational_complexity} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Products Matched</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{recommendations.length}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-primary" /> Client Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-foreground">{executiveSummary.client_overview}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Annual Revenue" value={formatCurrency(client.annual_revenue)} />
            <Stat label="Employees" value={client.employee_count.toLocaleString()} />
            <Stat label="Locations" value={client.number_of_locations.toString()} />
            <Stat label="Fraud History" value={client.fraud_history} />
          </div>
          {profileAnalysis.risk_factors.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {profileAnalysis.risk_factors.map((r) => (
                <Badge key={r} variant="warning">
                  {r}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ListChecks className="h-4 w-4 text-primary" /> Business Needs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed text-foreground">{executiveSummary.business_needs}</p>
          <div className="space-y-2">
            {needsAssessment.identified_needs.map((need) => (
              <div key={need.need} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                <Badge variant={need.severity >= 7 ? "destructive" : need.severity >= 4 ? "warning" : "outline"}>
                  {need.severity}/10
                </Badge>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{need.need}</p>
                  <p className="truncate text-xs text-muted-foreground">{need.evidence}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Recommended Products</h3>
        <RecommendationFeedbackList analysisId={analysisId} recommendations={recommendations} />
      </div>

      <SimilarClientsCard analysisId={analysisId} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Business Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground">{executiveSummary.business_benefits}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Implementation Priority</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {executiveSummary.implementation_priority.map((item) => (
              <div key={item.product} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.product}</p>
                  <p className="text-xs text-muted-foreground">{item.rationale}</p>
                </div>
                <Badge variant={PRIORITY_VARIANT[item.priority] ?? "outline"} className="shrink-0">
                  {item.priority}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning" /> Potential Risks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {executiveSummary.potential_risks.map((risk) => (
              <div key={risk} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                {risk}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-success/30 bg-success/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-success" /> Estimated Business Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground">{executiveSummary.estimated_business_impact}</p>
        </CardContent>
      </Card>

      <NotRecommendedList items={notRecommended} />

      {executiveSummary.cross_sell_opportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cross-Sell Opportunities</CardTitle>
            <CardDescription>Additional products worth raising in a future conversation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {executiveSummary.cross_sell_opportunities.map((item) => (
              <div key={item.product} className="rounded-lg border border-dashed border-border p-3">
                <p className="text-sm font-medium text-foreground">{item.product}</p>
                <p className="text-xs text-muted-foreground">{item.rationale}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <NextMeetingAgenda items={executiveSummary.next_meeting_agenda} />

      {complianceReport.issues.length > 0 && (
        <Card className="border-warning/40">
          <CardHeader>
            <CardTitle className="text-sm">Compliance Notes</CardTitle>
            <CardDescription>{complianceReport.notes}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {complianceReport.issues.map((issue, idx) => (
              <div key={idx} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <Badge variant={issue.severity === "High" ? "destructive" : issue.severity === "Medium" ? "warning" : "outline"}>
                  {issue.issue_type}
                </Badge>
                <p className="text-xs text-muted-foreground">{issue.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Separator />
      <p className="pb-4 text-center text-[11px] text-muted-foreground">
        Generated by Treasury Management Copilot — an AI decision-support tool. All recommendations should be
        reviewed and validated by a licensed Treasury Management Consultant before presentation to the client.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/50 p-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
