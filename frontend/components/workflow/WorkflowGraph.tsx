"use client";

import { motion } from "framer-motion";
import { ArrowDown, Building2, Calculator, ClipboardList, FileText, PackageSearch, ShieldCheck, Sparkles, Users } from "lucide-react";

import type { AgentKey, AgentStatus } from "@/lib/types";
import { AgentCard } from "./AgentCard";

const AGENT_META: Record<AgentKey, { icon: typeof Sparkles; title: string; description: string }> = {
  profile: {
    icon: Building2,
    title: "Client Profile Agent",
    description: "Analyzing business size, growth stage, and operational complexity",
  },
  needs: {
    icon: ClipboardList,
    title: "Needs Assessment Agent",
    description: "Identifying treasury management needs from client data",
  },
  historical: {
    icon: Users,
    title: "Historical Client Retrieval",
    description: "Finding similar past clients from the bank's institutional memory",
  },
  product: {
    icon: PackageSearch,
    title: "Product Recommendation Agent",
    description: "Matching needs against the ONB treasury product knowledge base",
  },
  roi: {
    icon: Calculator,
    title: "ROI Calculation Engine",
    description: "Computing deterministic cost/benefit projections from client volumes",
  },
  compliance: {
    icon: ShieldCheck,
    title: "Compliance Agent",
    description: "Validating recommendations for fit, duplicates, and conflicts",
  },
  executive: {
    icon: FileText,
    title: "Executive Summary Agent",
    description: "Synthesizing the final client-ready recommendation report",
  },
};

const AGENT_ORDER: AgentKey[] = ["profile", "needs", "historical", "product", "roi", "compliance", "executive"];

interface WorkflowGraphProps {
  statuses: Record<AgentKey, AgentStatus>;
  summaries: Partial<Record<AgentKey, string>>;
  companyName: string;
}

export function WorkflowGraph({ statuses, summaries, companyName }: WorkflowGraphProps) {
  const allComplete = AGENT_ORDER.every((k) => statuses[k] === "complete");

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center">
      <NodePill label={companyName} sublabel="Client Intake" active />
      <Connector />

      {AGENT_ORDER.map((key, idx) => {
        const meta = AGENT_META[key];
        return (
          <div key={key} className="w-full">
            <AgentCard
              icon={meta.icon}
              title={meta.title}
              description={meta.description}
              status={statuses[key]}
              resultSummary={summaries[key]}
            />
            {idx < AGENT_ORDER.length - 1 && <Connector />}
          </div>
        );
      })}

      <Connector />
      <NodePill
        label="Executive Report"
        sublabel={allComplete ? "Ready" : "Pending"}
        active={allComplete}
        highlight={allComplete}
      />
    </div>
  );
}

function Connector() {
  return (
    <div className="flex h-8 items-center justify-center text-border">
      <ArrowDown className="h-4 w-4" />
    </div>
  );
}

function NodePill({
  label,
  sublabel,
  active,
  highlight,
}: {
  label: string;
  sublabel: string;
  active?: boolean;
  highlight?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex w-full flex-col items-center rounded-xl border px-5 py-3 text-center shadow-sm ${
        highlight
          ? "border-success/50 bg-success/10"
          : active
            ? "border-primary/50 bg-accent"
            : "border-border bg-secondary/40"
      }`}
    >
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="text-[11px] text-muted-foreground">{sublabel}</p>
    </motion.div>
  );
}
