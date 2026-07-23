"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface ConfidenceGaugeProps {
  value: number; // 0-1
  size?: number;
}

function colorFor(value: number) {
  if (value >= 0.75) return "hsl(var(--success))";
  if (value >= 0.5) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

export function ConfidenceGauge({ value, size = 64 }: ConfidenceGaugeProps) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value));
  const color = colorFor(pct);

  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(var(--secondary))" strokeWidth={6} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <span className={cn("absolute text-xs font-semibold")} style={{ color }}>
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}
