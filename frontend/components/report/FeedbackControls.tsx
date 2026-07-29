"use client";

import { useState } from "react";
import { CheckCircle2, Pencil, XCircle } from "lucide-react";
import { toast } from "sonner";

import type { FeedbackRecord, FeedbackReason, ProductFeedbackStats } from "@/lib/types";
import { submitFeedback } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FeedbackDialog } from "./FeedbackDialog";

const STATUS_LABEL: Record<FeedbackRecord["action"], string> = {
  accept: "Accepted",
  reject: "Rejected",
  modify: "Modified",
};

interface FeedbackControlsProps {
  analysisId: string;
  productName: string;
  existingFeedback?: FeedbackRecord;
  stats?: ProductFeedbackStats;
  onFeedbackChange: (record: FeedbackRecord) => void;
}

export function FeedbackControls({ analysisId, productName, existingFeedback, stats, onFeedbackChange }: FeedbackControlsProps) {
  const [dialogAction, setDialogAction] = useState<"reject" | "modify" | null>(null);

  async function handleAccept() {
    try {
      const record = await submitFeedback(analysisId, { product_name: productName, action: "accept" });
      onFeedbackChange(record);
      toast.success(`Marked ${productName} as accepted`);
    } catch {
      toast.error("Could not save feedback. Please try again.");
    }
  }

  async function handleDialogSubmit(reason: FeedbackReason | undefined, note: string) {
    if (!dialogAction) return;
    try {
      const record = await submitFeedback(analysisId, { product_name: productName, action: dialogAction, reason, note });
      onFeedbackChange(record);
      toast.success(`Marked ${productName} as ${dialogAction === "reject" ? "rejected" : "modified"}`);
      setDialogAction(null);
    } catch {
      toast.error("Could not save feedback. Please try again.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
      <Button
        type="button"
        size="sm"
        variant={existingFeedback?.action === "accept" ? "default" : "outline"}
        onClick={handleAccept}
        className="gap-1.5"
      >
        <CheckCircle2 className="h-3.5 w-3.5" /> Accept
      </Button>
      <Button
        type="button"
        size="sm"
        variant={existingFeedback?.action === "reject" ? "destructive" : "outline"}
        onClick={() => setDialogAction("reject")}
        className="gap-1.5"
      >
        <XCircle className="h-3.5 w-3.5" /> Reject
      </Button>
      <Button
        type="button"
        size="sm"
        variant={existingFeedback?.action === "modify" ? "default" : "outline"}
        onClick={() => setDialogAction("modify")}
        className="gap-1.5"
      >
        <Pencil className="h-3.5 w-3.5" /> Modify
      </Button>

      {existingFeedback && (
        <Badge variant="outline" className="ml-1">
          Current status: {STATUS_LABEL[existingFeedback.action]}
        </Badge>
      )}

      {stats && stats.total_count > 0 && (
        <Badge variant="secondary" className="ml-auto">
          Historically accepted {stats.accept_count}/{stats.total_count} times ({Math.round(stats.acceptance_rate * 100)}%)
        </Badge>
      )}

      {dialogAction && (
        <FeedbackDialog
          open={dialogAction !== null}
          onOpenChange={(open) => !open && setDialogAction(null)}
          action={dialogAction}
          productName={productName}
          onSubmit={handleDialogSubmit}
        />
      )}
    </div>
  );
}
