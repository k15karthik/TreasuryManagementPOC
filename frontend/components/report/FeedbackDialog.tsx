"use client";

import { useState } from "react";

import type { FeedbackReason } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const REASON_OPTIONS: FeedbackReason[] = [
  "Already owns product",
  "Budget constraints",
  "Customer declined",
  "Not a good fit",
  "Other",
];

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "reject" | "modify";
  productName: string;
  onSubmit: (reason: FeedbackReason | undefined, note: string) => Promise<void>;
}

export function FeedbackDialog({ open, onOpenChange, action, productName, onSubmit }: FeedbackDialogProps) {
  const [reason, setReason] = useState<FeedbackReason | undefined>(undefined);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const noteRequired = action === "modify";

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onSubmit(reason, note);
      setReason(undefined);
      setNote("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action === "reject" ? "Reject recommendation" : "Modify recommendation"}</DialogTitle>
          <DialogDescription>{productName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {action === "reject" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Reason</label>
              <Select value={reason} onValueChange={(v) => setReason(v as FeedbackReason)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {noteRequired ? "What would you change?" : "Additional notes (optional)"}
            </label>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={noteRequired ? "e.g. Recommend a lower-tier version of this product instead" : undefined}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting || (noteRequired && note.trim() === "")}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
