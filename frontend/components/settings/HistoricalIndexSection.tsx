"use client";

import { useEffect, useState } from "react";
import { Database, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import type { HistoricalStatus } from "@/lib/types";
import { getHistoricalStatus, triggerReindex } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// An admin/maintenance action, not a consultant-facing one — deliberately kept out of the
// report flow and placed here instead, next to the app's other "Data Sources" info.
export function HistoricalIndexSection() {
  const [status, setStatus] = useState<HistoricalStatus | null>(null);
  const [reindexing, setReindexing] = useState(false);

  function refreshStatus() {
    getHistoricalStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  async function handleReindex() {
    setReindexing(true);
    try {
      const result = await triggerReindex();
      toast.success(
        result.count > 0
          ? `Reindexing ${result.count} analysis${result.count === 1 ? "" : "es"} in the background...`
          : "Everything is already indexed."
      );
      window.setTimeout(refreshStatus, 2000);
    } catch {
      toast.error("Could not start reindexing. Please try again.");
    } finally {
      setReindexing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Database className="h-4 w-4 text-primary" /> Historical Index
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between py-2.5 text-sm">
            <span className="text-muted-foreground">Analyses Indexed</span>
            <span className="text-right font-medium text-foreground">
              {status ? `${status.indexed} / ${status.total_analyses}` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5 text-sm">
            <span className="text-muted-foreground">Pending</span>
            <span className="text-right font-medium text-foreground">{status ? status.pending : "—"}</span>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleReindex} disabled={reindexing} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${reindexing ? "animate-spin" : ""}`} />
          {reindexing ? "Starting..." : "Reindex Historical Analyses"}
        </Button>
      </CardContent>
    </Card>
  );
}
