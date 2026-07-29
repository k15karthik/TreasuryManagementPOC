import { Users } from "lucide-react";

import type { BenchmarkStat } from "@/lib/types";

// Presentational only — fetched once for the whole report by RecommendationFeedbackList
// and fanned out per-product, so N recommendations never trigger N duplicate calls.
export function PeerBenchmarkCard({ stat }: { stat?: BenchmarkStat }) {
  if (!stat) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-[11px] text-muted-foreground">
      <Users className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span>
        <span className="font-semibold text-foreground">{stat.percentage.toFixed(0)}%</span> of {stat.cohort_size}{" "}
        similar clients adopted {stat.product_name}
      </span>
    </div>
  );
}
