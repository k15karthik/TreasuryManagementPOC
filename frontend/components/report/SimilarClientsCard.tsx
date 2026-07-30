"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";

import type { SimilarClient } from "@/lib/types";
import { ApiError, getSimilarClients } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type LoadState = "loading" | "ready" | "not-found" | "error";

// This is a genuine top-level fetch boundary (one report-level section, not per-recommendation
// data like PeerBenchmarkCard/RecommendationEvidencePanel), so it owns its own request.
export function SimilarClientsCard({ analysisId }: { analysisId: string }) {
  const [clients, setClients] = useState<SimilarClient[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    getSimilarClients(analysisId)
      .then((data) => {
        if (cancelled) return;
        setClients(data);
        setState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        // A 404 here means this specific backend instance's storage doesn't have this
        // analysis right now — not that the data was never there. Worth saying plainly
        // rather than implying something is permanently missing.
        setState(err instanceof ApiError && err.status === 404 ? "not-found" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-primary" /> Similar Clients
        </CardTitle>
        <CardDescription>
          Institutional memory — how comparable past clients were analyzed and whether their recommendations
          were accepted
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {state === "loading" && (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        )}

        {state === "error" && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Could not load similar-client data right now. Try refreshing the page.
          </p>
        )}

        {state === "not-found" && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Similar-client data is temporarily unavailable for this analysis. Try refreshing the page.
          </p>
        )}

        {state === "ready" && clients.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No similar historical clients found yet — this may be one of the first analyses in this industry.
          </p>
        )}

        {clients.map((c) => (
          <details key={c.matched_analysis_id} className="group rounded-lg border border-border p-3">
            <summary className="flex cursor-pointer select-none items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{c.anonymous_id}</span>
                <Badge variant="outline">{c.industry}</Badge>
              </div>
              <Badge variant="accent">{Math.round(c.similarity_score * 100)}% similar</Badge>
            </summary>
            <div className="mt-3 space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Business Size:</span> {c.business_size} ·{" "}
                <span className="font-medium text-foreground">Growth Stage:</span> {c.growth_stage}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {c.recommended_products.map((p) => (
                  <Badge
                    key={p}
                    variant={
                      c.consultant_accepted_products.includes(p)
                        ? "success"
                        : c.consultant_rejected_products.includes(p)
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {p}
                  </Badge>
                ))}
              </div>
              {c.roi_summary && <p>{c.roi_summary}</p>}
              <p className="italic">{c.outcome_summary}</p>
            </div>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}
