"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Download, FileSpreadsheet, Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";

import type { ClientProfile } from "@/lib/types";
import { BANKING_PRODUCT_OPTIONS, FRAUD_HISTORY_OPTIONS, INDUSTRY_OPTIONS, PAIN_POINT_OPTIONS, PAYMENT_METHOD_OPTIONS } from "@/lib/form-options";
import { SAMPLE_CLIENTS } from "@/lib/sample-clients";
import { parseClientExcel } from "@/lib/excel-import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CheckboxGroup } from "./CheckboxGroup";

const schema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  industry: z.string().min(1, "Industry is required"),
  annual_revenue: z.coerce.number().min(0, "Must be 0 or greater"),
  employee_count: z.coerce.number().int().min(1, "Must be at least 1"),
  number_of_locations: z.coerce.number().int().min(1, "Must be at least 1"),
  current_banking_products: z.array(z.string()).default([]),
  current_pain_points: z.array(z.string()).default([]),
  erp_system: z.string().default(""),
  current_payment_methods: z.array(z.string()).default([]),
  monthly_ach_volume: z.coerce.number().min(0).default(0),
  monthly_wire_volume: z.coerce.number().min(0).default(0),
  monthly_check_volume: z.coerce.number().min(0).default(0),
  monthly_cash_deposits: z.coerce.number().min(0).default(0),
  fraud_history: z.enum(FRAUD_HISTORY_OPTIONS).default("None"),
  growth_plans: z.string().default(""),
});

export type IntakeFormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: IntakeFormValues = {
  company_name: "",
  industry: "",
  annual_revenue: 0,
  employee_count: 1,
  number_of_locations: 1,
  current_banking_products: [],
  current_pain_points: [],
  erp_system: "",
  current_payment_methods: [],
  monthly_ach_volume: 0,
  monthly_wire_volume: 0,
  monthly_check_volume: 0,
  monthly_cash_deposits: 0,
  fraud_history: "None",
  growth_plans: "",
};

interface ClientIntakeFormProps {
  onSubmit: (client: ClientProfile) => void;
  isSubmitting?: boolean;
}

export function ClientIntakeForm({ onSubmit, isSubmitting }: ClientIntakeFormProps) {
  const form = useForm<IntakeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  function loadExample(label: string) {
    const example = SAMPLE_CLIENTS.find((s) => s.label === label);
    if (example) form.reset(example.profile as IntakeFormValues);
  }

  async function handleExcelSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    setIsImporting(true);
    try {
      const { profile, matchedCount, unrecognizedLabels, unmatchedValues } = await parseClientExcel(file);
      if (matchedCount === 0) {
        toast.error("No recognizable fields found in that file. Check the row labels and try again.");
        return;
      }

      form.reset({ ...form.getValues(), ...profile } as IntakeFormValues);
      toast.success(`Auto-populated ${matchedCount} field${matchedCount === 1 ? "" : "s"} from ${file.name}`);

      for (const msg of unmatchedValues) toast.warning(msg);
      if (unrecognizedLabels.length > 0) {
        toast.warning(`Didn't recognize ${unrecognizedLabels.length} row label(s): ${unrecognizedLabels.join(", ")}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that Excel file.");
    } finally {
      setIsImporting(false);
    }
  }

  function handleSubmit(values: IntakeFormValues) {
    onSubmit(values as ClientProfile);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card className="border-dashed border-primary/40 bg-accent/30">
          <CardContent className="flex flex-wrap items-center gap-2 p-4">
            <Wand2 className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-foreground">Load an example client:</span>
            {SAMPLE_CLIENTS.map((s) => (
              <Button key={s.label} type="button" variant="outline" size="sm" onClick={() => loadExample(s.label)}>
                {s.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-dashed border-primary/40 bg-accent/30">
          <CardContent className="flex flex-wrap items-center gap-2 p-4">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-foreground">Or auto-populate from an Excel file:</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={handleExcelSelected}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5"
            >
              {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
              {isImporting ? "Reading file..." : "Upload Excel"}
            </Button>
            <Button type="button" variant="ghost" size="sm" asChild className="gap-1.5">
              <a href="/templates/client-intake-template.xlsx" download>
                <Download className="h-3.5 w-3.5" />
                Download Template
              </a>
            </Button>
            <span className="text-[11px] text-muted-foreground">
              One row per field, e.g. &quot;Company Name&quot; in column A, the value in column B.
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company Profile</CardTitle>
            <CardDescription>Basic firmographic information about the client</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corporation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an industry" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INDUSTRY_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="annual_revenue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annual Revenue (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={1000} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="employee_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee Count</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="number_of_locations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Locations</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="erp_system"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ERP System</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. NetSuite, QuickBooks, SAP" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fraud_history"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fraud History</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FRAUD_HISTORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Banking & Payments</CardTitle>
            <CardDescription>What the client already has in place today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField
              control={form.control}
              name="current_banking_products"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Banking Products</FormLabel>
                  <CheckboxGroup options={BANKING_PRODUCT_OPTIONS} value={field.value} onChange={field.onChange} />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="current_payment_methods"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Payment Methods</FormLabel>
                  <CheckboxGroup options={PAYMENT_METHOD_OPTIONS} value={field.value} onChange={field.onChange} columns={1} />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="current_pain_points"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Pain Points</FormLabel>
                  <CheckboxGroup options={PAIN_POINT_OPTIONS} value={field.value} onChange={field.onChange} />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Volumes</CardTitle>
            <CardDescription>Approximate monthly dollar volume by payment type</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField
              control={form.control}
              name="monthly_ach_volume"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly ACH Volume</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <Input type="number" min={0} step={1000} className="pl-6" {...field} />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="monthly_wire_volume"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Wire Volume</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <Input type="number" min={0} step={1000} className="pl-6" {...field} />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="monthly_check_volume"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Check Volume</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <Input type="number" min={0} step={1000} className="pl-6" {...field} />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="monthly_cash_deposits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Cash Deposits</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <Input type="number" min={0} step={1000} className="pl-6" {...field} />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Growth Plans</CardTitle>
            <CardDescription>Narrative context that helps the AI reason about future needs</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="growth_plans"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="e.g. Expanding to 3 new markets in the next year, evaluating an acquisition..."
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={isSubmitting} className="gap-2">
            <Sparkles className="h-4 w-4" />
            {isSubmitting ? "Analyzing..." : "Generate AI Recommendations"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
