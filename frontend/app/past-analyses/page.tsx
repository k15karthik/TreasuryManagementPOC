import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { listAnalyses } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function PastAnalysesPage() {
  let analyses: Awaited<ReturnType<typeof listAnalyses>> = [];
  try {
    analyses = await listAnalyses();
  } catch {
    analyses = [];
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Card>
        <CardContent className="p-0">
          {analyses.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No analyses yet.{" "}
              <Link href="/client-input" className="text-primary underline">
                Start your first client analysis
              </Link>
              .
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead className="text-right">Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyses.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium text-foreground">{a.company_name}</TableCell>
                    <TableCell className="text-muted-foreground">{a.industry}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(a.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/analysis/${a.id}`} className="inline-flex items-center gap-1 text-sm text-primary">
                        View <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
