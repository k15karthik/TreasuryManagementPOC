import { TrendingUp } from "lucide-react";

import type { FeedbackRecord, ProductFeedbackStats, Recommendation } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceGauge } from "./ConfidenceGauge";
import { ROICard } from "./ROICard";
import { FeedbackControls } from "./FeedbackControls";

interface RecommendationCardProps {
  recommendation: Recommendation;
  rank: number;
  // Feedback controls only render when an analysisId is supplied, so this
  // component still works standalone (e.g. in the live in-progress view).
  analysisId?: string;
  existingFeedback?: FeedbackRecord;
  stats?: ProductFeedbackStats;
  onFeedbackChange?: (record: FeedbackRecord) => void;
}

export function RecommendationCard({
  recommendation,
  rank,
  analysisId,
  existingFeedback,
  stats,
  onFeedbackChange,
}: RecommendationCardProps) {
  return (
    <Card>
      <CardContent className="flex gap-4 p-5">
        <ConfidenceGauge value={recommendation.confidence} />

        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {rank}
            </span>
            <h4 className="text-sm font-semibold text-foreground">{recommendation.product}</h4>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">{recommendation.reasoning}</p>

          {recommendation.benefits.length > 0 && (
            <ul className="grid gap-1 sm:grid-cols-2">
              {recommendation.benefits.map((b) => (
                <li key={b} className="flex items-start gap-1.5 text-xs text-foreground">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  {b}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {!recommendation.roi_result && (
              <Badge variant="success" className="gap-1">
                <TrendingUp className="h-3 w-3" /> {recommendation.estimated_roi}
              </Badge>
            )}
            {recommendation.addresses_needs.map((need) => (
              <Badge key={need} variant="outline">
                {need}
              </Badge>
            ))}
          </div>

          {recommendation.roi_result && <ROICard roi={recommendation.roi_result} />}

          {analysisId && onFeedbackChange && (
            <FeedbackControls
              analysisId={analysisId}
              productName={recommendation.product}
              existingFeedback={existingFeedback}
              stats={stats}
              onFeedbackChange={onFeedbackChange}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
