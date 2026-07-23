import type { Product } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <Badge variant="accent" className="mb-1 w-fit">
          {product.category}
        </Badge>
        <CardTitle className="text-base">{product.name}</CardTitle>
        <CardDescription>{product.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div>
          <p className="text-xs font-semibold text-foreground">Ideal Client</p>
          <p className="text-xs text-muted-foreground">{product.ideal_client}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">Key Benefits</p>
          <ul className="mt-1 space-y-1">
            {product.benefits.slice(0, 3).map((b) => (
              <li key={b} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
          {product.pain_points_solved.map((p) => (
            <Badge key={p} variant="outline" className="text-[10px]">
              {p}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
