import { CalendarClock } from "lucide-react";

import type { AgendaItem } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function NextMeetingAgenda({ items }: { items: AgendaItem[] }) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <CalendarClock className="h-4 w-4 text-primary" /> Recommended Next Meeting Agenda
        </CardTitle>
        <CardDescription>Suggested talking points for the follow-up client conversation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, idx) => (
          <div key={item.topic} className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
              {idx + 1}
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">{item.topic}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
