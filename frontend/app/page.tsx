import Link from "next/link";
import { ArrowRight, FilePlus2, Library, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

import { listAnalyses, listProducts } from "@/lib/api";

export const dynamic = "force-dynamic";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

async function safeListAnalyses() {
  try {
    return await listAnalyses();
  } catch {
    return [];
  }
}

async function safeListProducts() {
  try {
    return await listProducts();
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const [analyses, products] = await Promise.all([safeListAnalyses(), safeListProducts()]);
  const recent = analyses.slice(0, 5);

  const stats = [
    { label: "Analyses Generated", value: analyses.length, icon: Sparkles },
    { label: "Products in Knowledge Base", value: products.length, icon: Library },
    { label: "Agents in Workflow", value: 5, icon: ShieldCheck },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
      <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary to-blue-800 p-8 text-primary-foreground shadow-sm">
        <div className="max-w-2xl">
          <Badge variant="accent" className="mb-4 bg-white/15 text-white">
            AI Treasury Advisor
          </Badge>
          <h2 className="text-2xl font-semibold tracking-tight">
            Augment every client conversation with AI-assisted Treasury Management recommendations
          </h2>
          <p className="mt-2 text-sm text-blue-100">
            Enter a client&apos;s profile and let a five-agent workflow analyze the business, assess needs,
            match products from the ONB knowledge base, run compliance review, and produce an
            executive-quality report — in seconds, not hours.
          </p>
          <Link href="/client-input">
            <Button size="lg" variant="secondary" className="mt-6 gap-2 bg-white text-primary hover:bg-blue-50">
              Start New Client Analysis <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{stat.value}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent Analyses</CardTitle>
              <CardDescription>The latest AI-generated client recommendation reports</CardDescription>
            </div>
            <Link href="/past-analyses">
              <Button variant="ghost" size="sm" className="gap-1 text-primary">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                No analyses yet. Start your first client analysis to see it here.
              </div>
            ) : (
              recent.map((a) => (
                <Link
                  key={a.id}
                  href={`/analysis/${a.id}`}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3 transition-colors hover:bg-accent/60"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.company_name}</p>
                    <p className="text-xs text-muted-foreground">{a.industry}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(a.created_at)}</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Jump into the most common workflows</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/client-input" className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent/60">
              <FilePlus2 className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">New Client Intake</p>
                <p className="text-xs text-muted-foreground">Run the 5-agent workflow</p>
              </div>
            </Link>
            <Link href="/knowledge-base" className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent/60">
              <Library className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Browse Products</p>
                <p className="text-xs text-muted-foreground">{products.length} treasury products</p>
              </div>
            </Link>
            <Link href="/past-analyses" className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent/60">
              <TrendingUp className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Review History</p>
                <p className="text-xs text-muted-foreground">{analyses.length} past analyses</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
