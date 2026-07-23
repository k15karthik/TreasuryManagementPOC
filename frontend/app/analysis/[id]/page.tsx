import { notFound } from "next/navigation";

import { getAnalysis } from "@/lib/api";
import { ExecutiveReport } from "@/components/report/ExecutiveReport";

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let analysis;
  try {
    analysis = await getAnalysis(id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <ExecutiveReport
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
