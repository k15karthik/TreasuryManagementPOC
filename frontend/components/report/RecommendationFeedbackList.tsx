"use client";

import { useEffect, useState } from "react";

import type { BenchmarkStat, FeedbackRecord, ProductFeedbackStats, Recommendation } from "@/lib/types";
import { getBenchmarks, getFeedbackStats, listFeedback } from "@/lib/api";
import { RecommendationCard } from "./RecommendationCard";

interface RecommendationFeedbackListProps {
  analysisId: string;
  recommendations: Recommendation[];
}

export function RecommendationFeedbackList({ analysisId, recommendations }: RecommendationFeedbackListProps) {
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [stats, setStats] = useState<ProductFeedbackStats[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkStat[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listFeedback(analysisId), getFeedbackStats(), getBenchmarks(analysisId)])
      .then(([feedbackRows, statsResponse, benchmarkRows]) => {
        if (cancelled) return;
        setFeedback(feedbackRows);
        setStats(statsResponse.per_product);
        setBenchmarks(benchmarkRows);
      })
      .catch(() => {
        // Feedback/benchmarks are progressive enhancements on top of the report — if they
        // fail to load, the report itself should still render fine without them.
      });
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  function latestFor(productName: string): FeedbackRecord | undefined {
    const rows = feedback.filter((f) => f.product_name === productName);
    return rows.length > 0 ? rows[rows.length - 1] : undefined;
  }

  function statsFor(productName: string): ProductFeedbackStats | undefined {
    return stats.find((s) => s.product_name === productName);
  }

  function benchmarkFor(productName: string): BenchmarkStat | undefined {
    return benchmarks.find((b) => b.product_name === productName);
  }

  function handleFeedbackChange(record: FeedbackRecord) {
    setFeedback((prev) => [...prev, record]);
  }

  return (
    <div className="space-y-3">
      {recommendations.map((rec, idx) => (
        <RecommendationCard
          key={rec.product}
          recommendation={rec}
          rank={idx + 1}
          analysisId={analysisId}
          existingFeedback={latestFor(rec.product)}
          stats={statsFor(rec.product)}
          benchmark={benchmarkFor(rec.product)}
          onFeedbackChange={handleFeedbackChange}
        />
      ))}
    </div>
  );
}
