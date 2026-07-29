import { Calculator, TrendingDown, TrendingUp } from "lucide-react";

import type { ROIResult } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <div className="rounded-lg bg-secondary/50 p-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={
          "text-sm font-semibold " +
          (tone === "positive" ? "text-success" : tone === "negative" ? "text-destructive" : "text-foreground")
        }
      >
        {value}
      </p>
    </div>
  );
}

export function ROICard({ roi }: { roi: ROIResult }) {
  const roiPositive = roi.roi_percentage_year_1 >= 0;

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <Calculator className="h-3.5 w-3.5 text-primary" />
        Calculated ROI
        <Badge variant={roiPositive ? "success" : "destructive"} className="ml-auto gap-1">
          {roiPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {roi.roi_percentage_year_1.toFixed(0)}% year 1
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Annual Savings" value={formatCurrency(roi.annual_savings_usd)} />
        <Stat label="Monthly Savings" value={formatCurrency(roi.monthly_savings_usd)} />
        <Stat
          label="Payback Period"
          value={roi.payback_period_months !== null ? `${roi.payback_period_months.toFixed(1)} mo` : "N/A"}
        />
        {roi.cost_avoidance_usd > 0 ? (
          <Stat label="Cost Avoidance" value={formatCurrency(roi.cost_avoidance_usd)} />
        ) : (
          <Stat label="Implementation Cost" value={formatCurrency(roi.implementation_cost_usd)} />
        )}
      </div>

      <details className="group rounded-md border border-dashed border-border bg-muted/30 p-2.5">
        <summary className="cursor-pointer select-none text-[11px] font-medium text-muted-foreground group-open:text-foreground">
          Assumptions used (calculated figures above are distinct from these inputs)
        </summary>
        <div className="mt-2 space-y-2 text-[11px] text-muted-foreground">
          <ol className="list-decimal space-y-0.5 pl-4">
            {roi.calculation_steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border pt-2">
            <span>Implementation cost: {formatCurrency(roi.assumptions.implementation_cost_usd)}</span>
            <span>Monthly fee: {formatCurrency(roi.assumptions.monthly_fee_usd)}</span>
            {roi.assumptions.labor_rate_per_hour_usd > 0 && (
              <span>Labor rate: {formatCurrency(roi.assumptions.labor_rate_per_hour_usd)}/hr</span>
            )}
            {roi.assumptions.fraud_loss_reduction_rate > 0 && (
              <span>Fraud loss reduction: {(roi.assumptions.fraud_loss_reduction_rate * 100).toFixed(0)}%</span>
            )}
            {roi.assumptions.annual_interest_rate > 0 && (
              <span>Assumed yield: {(roi.assumptions.annual_interest_rate * 100).toFixed(1)}%/yr</span>
            )}
          </div>
          <p className="italic">{roi.assumptions.source_note}</p>
        </div>
      </details>
    </div>
  );
}
