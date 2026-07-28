import readXlsxFile from "read-excel-file";

import type { ClientProfile, FraudHistory } from "./types";
import {
  BANKING_PRODUCT_OPTIONS,
  FRAUD_HISTORY_OPTIONS,
  INDUSTRY_OPTIONS,
  PAIN_POINT_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
} from "./form-options";

// Expects a two-column "Field | Value" sheet (one client per file), e.g.:
//   Company Name              | Acme Corporation
//   Annual Revenue            | 5000000
//   Current Banking Products  | Business Checking, Merchant Services
const FIELD_ALIASES: Record<string, keyof ClientProfile> = {
  "company name": "company_name",
  "company": "company_name",
  "industry": "industry",
  "annual revenue": "annual_revenue",
  "annual revenue usd": "annual_revenue",
  "revenue": "annual_revenue",
  "employee count": "employee_count",
  "employees": "employee_count",
  "number of employees": "employee_count",
  "number of locations": "number_of_locations",
  "locations": "number_of_locations",
  "current banking products": "current_banking_products",
  "banking products": "current_banking_products",
  "current pain points": "current_pain_points",
  "pain points": "current_pain_points",
  "erp system": "erp_system",
  "erp": "erp_system",
  "current payment methods": "current_payment_methods",
  "payment methods": "current_payment_methods",
  "monthly ach volume": "monthly_ach_volume",
  "ach volume": "monthly_ach_volume",
  "monthly wire volume": "monthly_wire_volume",
  "wire volume": "monthly_wire_volume",
  "monthly check volume": "monthly_check_volume",
  "check volume": "monthly_check_volume",
  "monthly cash deposits": "monthly_cash_deposits",
  "cash deposits": "monthly_cash_deposits",
  "fraud history": "fraud_history",
  "growth plans": "growth_plans",
  "growth": "growth_plans",
};

const NUMBER_FIELDS = new Set<keyof ClientProfile>([
  "annual_revenue",
  "employee_count",
  "number_of_locations",
  "monthly_ach_volume",
  "monthly_wire_volume",
  "monthly_check_volume",
  "monthly_cash_deposits",
]);

const LIST_FIELD_OPTIONS: Partial<Record<keyof ClientProfile, string[]>> = {
  current_banking_products: BANKING_PRODUCT_OPTIONS,
  current_pain_points: PAIN_POINT_OPTIONS,
  current_payment_methods: PAYMENT_METHOD_OPTIONS,
};

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[_:()]+/g, " ")
    .replace(/\s+/g, " ");
}

function parseNumber(raw: string): number {
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// Case-insensitive match against a fixed option list; falls back to the raw
// value so nothing is silently dropped, even if the UI can't highlight it.
function matchOption(raw: string, options: readonly string[]): string {
  const found = options.find((opt) => opt.toLowerCase() === raw.toLowerCase());
  return found ?? raw;
}

function parseFraudHistory(raw: string): FraudHistory {
  const found = FRAUD_HISTORY_OPTIONS.find((opt) => opt.toLowerCase() === raw.trim().toLowerCase());
  return found ?? "None";
}

export interface ExcelImportResult {
  profile: Partial<ClientProfile>;
  matchedCount: number;
  unrecognizedLabels: string[];
  unmatchedValues: string[];
}

export async function parseClientExcel(file: File): Promise<ExcelImportResult> {
  const rows = await readXlsxFile(file);

  const profile: Partial<ClientProfile> = {};
  const unrecognizedLabels: string[] = [];
  const unmatchedValues: string[] = [];
  let matchedCount = 0;

  for (const row of rows) {
    const [rawKey, rawValue] = row;
    if (rawKey == null || rawValue == null || String(rawValue).trim() === "") continue;

    const key = normalizeKey(String(rawKey));
    const field = FIELD_ALIASES[key];
    if (!field) {
      unrecognizedLabels.push(String(rawKey).trim());
      continue;
    }

    const valueStr = String(rawValue).trim();

    if (NUMBER_FIELDS.has(field)) {
      (profile as Record<string, unknown>)[field] = parseNumber(valueStr);
    } else if (field === "fraud_history") {
      profile.fraud_history = parseFraudHistory(valueStr);
    } else if (field === "industry") {
      const matched = matchOption(valueStr, INDUSTRY_OPTIONS);
      if (matched === valueStr && !INDUSTRY_OPTIONS.includes(valueStr)) {
        unmatchedValues.push(`Industry "${valueStr}" not recognized — set to "Other"`);
        profile.industry = "Other";
      } else {
        profile.industry = matched;
      }
    } else if (field in LIST_FIELD_OPTIONS) {
      const options = LIST_FIELD_OPTIONS[field]!;
      const items = valueStr
        .split(/[,;]/)
        .map((v) => v.trim())
        .filter(Boolean)
        .map((item) => {
          const matched = matchOption(item, options);
          if (matched === item && !options.includes(item)) {
            unmatchedValues.push(`"${item}" (under ${String(rawKey).trim()}) didn't match a known option`);
          }
          return matched;
        });
      (profile as Record<string, unknown>)[field] = items;
    } else {
      (profile as Record<string, unknown>)[field] = valueStr;
    }

    matchedCount += 1;
  }

  return { profile, matchedCount, unrecognizedLabels, unmatchedValues };
}
