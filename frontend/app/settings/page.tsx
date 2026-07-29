import { Bot, Building, Database, KeyRound } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { HistoricalIndexSection } from "@/components/settings/HistoricalIndexSection";

const SETTINGS_SECTIONS = [
  {
    icon: Building,
    title: "Organization",
    rows: [
      { label: "Institution", value: "Oceanview National Bank" },
      { label: "Business Line", value: "Commercial Treasury Management" },
      { label: "Environment", value: "Proof of Concept" },
    ],
  },
  {
    icon: Bot,
    title: "AI Configuration",
    rows: [
      { label: "Orchestration Framework", value: "LangGraph" },
      { label: "Language Model Provider", value: "OpenAI" },
      {
        label: "Pipeline Steps",
        value: "7 (Profile, Needs, Historical Retrieval, Product, ROI, Compliance, Executive)",
      },
    ],
  },
  {
    icon: Database,
    title: "Data Sources",
    rows: [
      { label: "Product Knowledge Base", value: "ChromaDB (local vector store)" },
      { label: "Historical Client RAG", value: "ChromaDB (second, separate vector store)" },
      { label: "Analysis History", value: "SQLite" },
      { label: "Products Catalog", value: "12 ONB Treasury Management products" },
    ],
  },
  {
    icon: KeyRound,
    title: "Access",
    rows: [
      { label: "Signed in as", value: "Treasury Management Consultant" },
      { label: "Role", value: "Advisory — recommendations require TMC review before client presentation" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <Card className="border-primary/20 bg-accent/30">
        <CardContent className="p-5">
          <Badge variant="accent" className="mb-2">
            Read-only demo settings
          </Badge>
          <p className="text-sm text-foreground">
            This proof of concept ships with a fixed configuration for demonstration purposes. In a production
            deployment, these values would be editable by workspace administrators.
          </p>
        </CardContent>
      </Card>

      {SETTINGS_SECTIONS.map((section) => {
        const Icon = section.icon;
        return (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 text-primary" /> {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {section.rows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="text-right font-medium text-foreground">{row.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <HistoricalIndexSection />

      <CardDescription className="text-center text-xs">
        Treasury Management Copilot v1.0.0 — Internal Proof of Concept
      </CardDescription>
      <Separator />
    </div>
  );
}
