"""Builds the anonymized, privacy-scrubbed document embedded into the historical-analysis
vector store, plus the industry bucketing used for anonymous IDs and peer benchmarks."""
import logging
import re

logger = logging.getLogger(__name__)

# Ordered keyword -> bucket table. ClientProfile.industry is free text (not an enum), so this
# maps it down to a short, stable label used both for anonymous IDs ("Manufacturing Client #17")
# and for grouping the peer-benchmark cohort. First match wins; unmatched falls back to "Business".
INDUSTRY_BUCKET_KEYWORDS: list[tuple[str, str]] = [
    ("manufactur", "Manufacturing"),
    ("health", "Healthcare"),
    ("medical", "Healthcare"),
    ("restaurant", "Restaurant"),
    ("hospitality", "Restaurant"),
    ("retail", "Retail"),
    ("saas", "Technology"),
    ("software", "Technology"),
    ("technology", "Technology"),
    ("construction", "Construction"),
    ("real estate", "Construction"),
    ("agricultur", "Agriculture"),
    ("farm", "Agriculture"),
    ("wholesale", "Distribution"),
    ("distribution", "Distribution"),
    ("professional service", "Professional Services"),
    ("consulting", "Professional Services"),
    ("nonprofit", "Nonprofit"),
    ("non-profit", "Nonprofit"),
]

_GENERIC_CORPORATE_SUFFIXES = {
    "inc", "llc", "corp", "corporation", "company", "co",
    "group", "partners", "holdings", "ltd", "llp", "pllc",
}


def industry_bucket(industry: str) -> str:
    lowered = (industry or "").lower()
    for keyword, bucket in INDUSTRY_BUCKET_KEYWORDS:
        if keyword in lowered:
            return bucket
    return "Business"


def _redact_company_name(text: str, company_name: str) -> str:
    """Best-effort privacy scrub: replaces the literal company name and each of its
    individually significant words with [CLIENT]. This is a heuristic, not a guarantee
    against every possible LLM paraphrase — it reliably protects the actual security
    boundary that matters here, which is that one client's report must never surface
    another client's company name, literal or by its distinguishing words.
    """
    if not text or not company_name:
        return text

    redacted = re.sub(re.escape(company_name), "[CLIENT]", text, flags=re.IGNORECASE)

    for token in company_name.split():
        token = token.strip(".,")
        if len(token) < 3 or token.lower() in _GENERIC_CORPORATE_SUFFIXES:
            continue
        redacted = re.sub(rf"\b{re.escape(token)}\b", "[CLIENT]", redacted, flags=re.IGNORECASE)

    return redacted


def build_analysis_document(dumped: dict) -> str:
    """Assembles one combined semantic document representing the entire engagement, for
    embedding into the historical-analysis vector store.

    Takes a single, plain-JSON-shaped dict — the same shape both `_dump(accumulated)`
    (real-time indexing) and `analysis_to_dict()` (reindex backfill) already produce — so
    there is exactly one input contract regardless of which caller invokes this.

    Every narrative (LLM-authored) string is scrubbed of the client's company name before
    assembly, since LLMs routinely restate a subject's name in generated summaries — a
    field allowlist alone would not protect against leaking identity through prose.
    """
    client = dumped.get("client") or {}
    profile = dumped.get("profile_analysis") or {}
    needs = dumped.get("needs_assessment") or {}
    recommendations = dumped.get("recommendations") or []
    compliance = dumped.get("compliance_report") or {}
    executive = dumped.get("executive_summary") or {}

    company_name = client.get("company_name", "")

    def scrub(text) -> str:
        return _redact_company_name(str(text or ""), company_name)

    needs_lines = "\n".join(
        f"- {n.get('need', '')} (severity {n.get('severity', '?')}/10): {scrub(n.get('evidence', ''))}"
        for n in needs.get("identified_needs", [])
    ) or "None identified"

    rec_lines = "\n".join(
        f"- {r.get('product', '')}: {scrub(r.get('reasoning', ''))} (ROI: {scrub(r.get('estimated_roi', ''))})"
        for r in recommendations
    ) or "None"

    roi_lines = "\n".join(
        f"- {r.get('product')}: {r['roi_result']['roi_percentage_year_1']:.0f}% year-1 ROI"
        for r in recommendations
        if r.get("roi_result")
    ) or "Not calculated"

    executive_narrative = " ".join(
        scrub(executive.get(field, ""))
        for field in ("client_overview", "business_needs", "business_benefits", "estimated_business_impact")
    )

    document = f"""Industry: {client.get('industry', '')}
Annual Revenue: ${client.get('annual_revenue', 0):,.0f}
Employee Count: {client.get('employee_count', '')}
Number of Locations: {client.get('number_of_locations', '')}
Business Size: {profile.get('company_size', '')}
Growth Stage: {profile.get('growth_stage', '')}
Operational Complexity: {profile.get('operational_complexity', '')}/10
Current Banking Products: {', '.join(client.get('current_banking_products', []))}
Current Payment Methods: {', '.join(client.get('current_payment_methods', []))}
Monthly ACH Volume: ${client.get('monthly_ach_volume', 0):,.0f}
Monthly Wire Volume: ${client.get('monthly_wire_volume', 0):,.0f}
Monthly Check Volume: ${client.get('monthly_check_volume', 0):,.0f}
Monthly Cash Deposits: ${client.get('monthly_cash_deposits', 0):,.0f}
Pain Points: {', '.join(client.get('current_pain_points', []))}
Fraud History: {client.get('fraud_history', '')}
ERP System: {client.get('erp_system', '')}
Growth Plans: {scrub(client.get('growth_plans', ''))}

Business Summary: {scrub(profile.get('business_summary', ''))}
Risk Factors: {', '.join(profile.get('risk_factors', []))}

Needs Assessment:
{needs_lines}
Needs Summary: {scrub(needs.get('summary', ''))}

Recommended Products:
{rec_lines}

ROI Summary:
{roi_lines}

Compliance Notes: {scrub(compliance.get('notes', ''))}

Executive Summary: {executive_narrative}
""".strip()

    if company_name and company_name.lower() in document.lower():
        logger.warning("Historical analysis document may still contain the client's company name after scrubbing")

    return document
