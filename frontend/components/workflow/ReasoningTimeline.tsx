"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface TimelineEntry {
  id: string;
  label: string;
  status: "thinking" | "complete";
  timestamp: string;
}

export function ReasoningTimeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Reasoning Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-72 space-y-3 overflow-y-auto scrollbar-thin pr-1">
          <AnimatePresence initial={false}>
            {entries.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-3"
              >
                <div className="mt-0.5">
                  {entry.status === "complete" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground">
                    {entry.label}{" "}
                    <span className="font-normal text-muted-foreground">
                      {entry.status === "complete" ? "finished reasoning" : "started reasoning"}
                    </span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">{entry.timestamp}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {entries.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">Timeline will appear once analysis starts.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
