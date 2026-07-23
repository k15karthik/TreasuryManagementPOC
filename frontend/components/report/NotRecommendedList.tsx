import { XCircle } from "lucide-react";

import type { NotRecommendedProduct } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function NotRecommendedList({ items }: { items: NotRecommendedProduct[] }) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Products Not Recommended</CardTitle>
        <CardDescription>Considered by the Product Agent, but ruled out for this client</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.product} className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-3">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">{item.product}</p>
              <p className="text-xs text-muted-foreground">{item.reason}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
