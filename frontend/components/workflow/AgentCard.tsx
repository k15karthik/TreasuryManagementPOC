"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Loader2, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AgentStatus } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AgentCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  status: AgentStatus;
  resultSummary?: string;
}

const STATUS_LABEL: Record<AgentStatus, string> = {
  pending: "Waiting",
  thinking: "Thinking...",
  complete: "Complete",
};

export function AgentCard({ icon: Icon, title, description, status, resultSummary }: AgentCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: status === "pending" ? 0.55 : 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card
        className={cn(
          "relative overflow-hidden transition-shadow",
          status === "thinking" && "border-primary/50 shadow-md",
          status === "complete" && "border-success/40"
        )}
      >
        {status === "thinking" && (
          <motion.div
            className="absolute inset-0 bg-shimmer opacity-40"
            animate={{ backgroundPosition: ["0% 0%", "-200% 0%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          />
        )}
        <CardContent className="relative flex items-start gap-4 p-5">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              status === "complete" ? "bg-success/15 text-success" : "bg-accent text-accent-foreground"
            )}
          >
            {status === "thinking" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : status === "complete" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Icon className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <Badge
                variant={status === "complete" ? "success" : status === "thinking" ? "accent" : "outline"}
                className="shrink-0"
              >
                {STATUS_LABEL[status]}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            {resultSummary && status === "complete" && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="mt-2 rounded-md bg-secondary/60 px-3 py-2 text-xs leading-relaxed text-foreground"
              >
                {resultSummary}
              </motion.p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
