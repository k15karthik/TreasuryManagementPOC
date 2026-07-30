import Link from "next/link";
import { RefreshCw } from "lucide-react";

import { getAnalysis } from "@/lib/api";
import { ExecutiveReport } from "@/components/report/ExecutiveReport";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let analysis;
  try {
    analysis = await getAnalysis(id);
  } catch {
    // A failed load here doesn't reliably mean the analysis never existed — the backend
    // can serve different requests from different instances that don't share storage, so
    // the same ID can succeed a moment later. Treat this as recoverable, not a hard 404.
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <RefreshCw className="h-6 w-6 text-warning" />
            <p className="text-sm font-medium text-foreground">This report is temporarily unavailable</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              It can take a moment to become available right after generation. Try refreshing, or check Past
              Analyses in the meantime.
            </p>
            <div className="flex gap-2 pt-2">
              <Button asChild size="sm" variant="outline">
                <Link href={`/analysis/${id}`}>Refresh</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/past-analyses">Past Analyses</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <ExecutiveReport
        analysisId={id}
        client={analysis.client}
        profileAnalysis={analysis.profile_analysis}
        needsAssessment={analysis.needs_assessment}
        recommendations={analysis.recommendations}
        notRecommended={analysis.not_recommended}
        complianceReport={analysis.compliance_report}
        executiveSummary={analysis.executive_summary}
      />
    </div>
  );
}
