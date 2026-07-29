import { Lightbulb } from "lucide-react";

import type { RecommendationEvidence } from "@/lib/types";

// Presentational only — `evidence` already rides on the Recommendation object from
// getAnalysis()/the `done` SSE event, exactly like roi_result does. No fetch here.
export function RecommendationEvidencePanel({
  evidence,
  confidence,
}: {
  evidence?: RecommendationEvidence;
  confidence: number;
}) {
  if (!evidence) return null;

  return (
    <details className="group rounded-md border border-dashed border-border bg-muted/30 p-2.5">
      <summary className="flex cursor-pointer select-none items-center gap-1.5 text-[11px] font-medium text-muted-foreground group-open:text-foreground">
        <Lightbulb className="h-3 w-3" /> Why this recommendation
      </summary>
      <div className="mt-2 space-y-1.5 text-[11px] text-muted-foreground">
        <EvidenceRow label="Client Need" value={evidence.client_need_evidence} />
        <EvidenceRow label="Knowledge Base" value={evidence.knowledge_base_evidence} />
        <EvidenceRow label="Historical Clients" value={evidence.historical_evidence} />
        {evidence.roi_evidence && <EvidenceRow label="ROI" value={evidence.roi_evidence} />}
        <p className="pt-1 text-[11px] font-medium text-foreground">Confidence: {Math.round(confidence * 100)}%</p>
      </div>
    </details>
  );
}

function EvidenceRow({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-medium text-foreground">{label}:</span> {value}
    </p>
  );
}
