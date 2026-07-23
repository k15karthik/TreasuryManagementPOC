"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { streamAnalysis } from "@/lib/api";
import type { AgentKey, AgentStatus, ClientProfile, DoneEvent, WorkflowEvent } from "@/lib/types";
import { PENDING_CLIENT_KEY } from "@/lib/constants";
import { WorkflowGraph } from "@/components/workflow/WorkflowGraph";
import { ReasoningTimeline, type TimelineEntry } from "@/components/workflow/ReasoningTimeline";
import { ExecutiveReport } from "@/components/report/ExecutiveReport";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const INITIAL_STATUSES: Record<AgentKey, AgentStatus> = {
  profile: "pending",
  needs: "pending",
  product: "pending",
  compliance: "pending",
  executive: "pending",
};

function summarize(agent: AgentKey, output: unknown): string {
  if (!output || typeof output !== "object") return "";
  const o = output as Record<string, unknown>;
  switch (agent) {
    case "profile":
      return String((o.profile_analysis as Record<string, unknown>)?.business_summary ?? "");
    case "needs":
      return String((o.needs_assessment as Record<string, unknown>)?.summary ?? "");
    case "product": {
      const recs = (o.recommendations as unknown[]) ?? [];
      return `${recs.length} product${recs.length === 1 ? "" : "s"} recommended`;
    }
    case "compliance": {
      const report = o.compliance_report as Record<string, unknown>;
      return report?.is_approved ? "All recommendations passed compliance review" : "Flagged for attention — see notes";
    }
    case "executive":
      return "Executive report generated";
    default:
      return "";
  }
}

export default function LiveAnalysisPage() {
  const router = useRouter();
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [statuses, setStatuses] = useState<Record<AgentKey, AgentStatus>>(INITIAL_STATUSES);
  const [summaries, setSummaries] = useState<Partial<Record<AgentKey, string>>>({});
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [done, setDone] = useState<DoneEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(PENDING_CLIENT_KEY);
    if (!raw) {
      router.replace("/client-input");
      return;
    }
    const parsed = JSON.parse(raw) as ClientProfile;
    setClient(parsed);

    if (started.current) return;
    started.current = true;

    const controller = new AbortController();

    function handleEvent(event: WorkflowEvent) {
      if (event.type === "agent_update") {
        setStatuses((prev) => ({ ...prev, [event.agent]: event.status }));
        setTimeline((prev) => [
          ...prev,
          {
            id: `${event.agent}-${event.status}-${prev.length}`,
            label: event.label,
            status: event.status,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        if (event.status === "complete" && event.output) {
          setSummaries((prev) => ({ ...prev, [event.agent]: summarize(event.agent, event.output) }));
        }
      } else if (event.type === "done") {
        setDone(event);
        sessionStorage.removeItem(PENDING_CLIENT_KEY);
        window.setTimeout(() => router.replace(`/analysis/${event.analysis_id}`), 900);
      } else if (event.type === "error") {
        setError(event.message);
      }
    }

    streamAnalysis(parsed, handleEvent, controller.signal).catch((err) => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Analysis failed");
    });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!client) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-8">
      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Analysis failed</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => router.push("/client-input")}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {!done && (
        <>
          <WorkflowGraph statuses={statuses} summaries={summaries} companyName={client.company_name} />
          <ReasoningTimeline entries={timeline} />
        </>
      )}

      {done && (
        <ExecutiveReport
          client={done.client}
          profileAnalysis={done.profile_analysis}
          needsAssessment={done.needs_assessment}
          recommendations={done.recommendations}
          notRecommended={done.not_recommended}
          complianceReport={done.compliance_report}
          executiveSummary={done.executive_summary}
        />
      )}
    </div>
  );
}
