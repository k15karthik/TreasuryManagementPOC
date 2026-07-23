"use client";

import { motion } from "framer-motion";

interface MeterBarProps {
  label: string;
  value: number; // 1-10
  lowLabel?: string;
  highLabel?: string;
}

function colorFor(value: number) {
  if (value >= 7) return "bg-destructive";
  if (value >= 4) return "bg-warning";
  return "bg-success";
}

export function MeterBar({ label, value, lowLabel = "Low", highLabel = "High" }: MeterBarProps) {
  const pct = Math.max(0, Math.min(10, value)) * 10;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-xs font-semibold text-foreground">{value}/10</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <motion.div
          className={`h-full rounded-full ${colorFor(value)}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
