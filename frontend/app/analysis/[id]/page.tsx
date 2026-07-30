import Link from "next/link";

import { getAnalysis } from "@/lib/api";
import { ExecutiveReport } from "@/components/report/ExecutiveReport";

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let analysis;
  try {
    analysis = await getAnalysis(id);
  } catch {
    // getAnalysis() already retries past the common transient case (the write briefly
    // invisible from wherever this request lands). If it still failed, keep this small —
    // a one-line notice, not a full-page takeover — since the report itself may well be
    // fine on the very next request.
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <p className="py-8 text-center text-xs text-muted-foreground">
          This report isn&apos;t loading right now.{" "}
          <Link href={`/analysis/${id}`} className="text-primary underline">
            Try again
          </Link>
          , or check{" "}
          <Link href="/past-analyses" className="text-primary underline">
            Past Analyses
          </Link>
          .
        </p>
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
