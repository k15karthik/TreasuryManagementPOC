"""Deterministic ROI calculation engine.

Unlike every agent in app/agents/, this module makes no LLM calls — it computes
ROIResult objects in plain Python from the client's actual volumes and a set of
documented per-category assumptions. Formulas are intentionally simple and
traceable (each result carries its own arithmetic trace) rather than a black box.
"""
from app.knowledge.loader import load_products
from app.models.agent_outputs import ROIAssumptions, ROIResult
from app.models.client import ClientProfile, FraudHistory

# Annual fraud-loss exposure assumed for each fraud history tier, used only by
# the Fraud Prevention category to estimate cost avoidance.
FRAUD_LOSS_BASELINE: dict[FraudHistory, float] = {
    FraudHistory.NONE: 0.0,
    FraudHistory.MINOR_INCIDENT: 15_000.0,
    FraudHistory.SIGNIFICANT_LOSS: 75_000.0,
    FraudHistory.ONGOING_CONCERN: 150_000.0,
}

CATEGORY_ASSUMPTIONS: dict[str, dict] = {
    "Fraud Prevention": {
        "implementation_cost_usd": 2_500.0,
        "monthly_fee_usd": 200.0,
        "fraud_loss_reduction_rate": 0.65,
        "source_note": (
            "Baseline annual fraud-loss exposure by fraud-history tier and a 65% mitigation rate are "
            "industry-benchmark estimates, not this client's actual loss data — validate against their "
            "real incident history before presenting."
        ),
    },
    "Payments": {
        "implementation_cost_usd": 3_000.0,
        "monthly_fee_usd": 250.0,
        "manual_check_cost_usd": 8.50,
        "electronic_cost_per_item_usd": 0.30,
        "avg_check_size_usd": 1500.0,
        "source_note": (
            "Assumes an average check size of $1,500 to estimate monthly check count from dollar volume, "
            "and a $8.50-per-check manual processing cost vs. $0.30 per electronic item — commercial "
            "treasury industry benchmarks, not this client's measured costs."
        ),
    },
    "Receivables": {
        "implementation_cost_usd": 3_500.0,
        "monthly_fee_usd": 300.0,
        "labor_rate_per_hour_usd": 35.0,
        "avg_check_size_usd": 1500.0,
        "minutes_per_check": 4.0,
        "source_note": (
            "Assumes an average check size of $1,500 and 4 minutes of manual handling per mailed check "
            "at a $35/hour fully-loaded labor rate — adjust to the client's actual AR staffing cost."
        ),
    },
    "Cash Management": {
        "implementation_cost_usd": 2_500.0,
        "monthly_fee_usd": 350.0,
        "cost_per_branch_trip_usd": 45.0,
        "trips_saved_per_location_per_month": 20.0,
        "source_note": (
            "Assumes 20 fewer branch deposit trips per location per month at $45 per trip (staff time plus "
            "opportunity cost) — scale to the client's actual deposit frequency and location count."
        ),
    },
    "Liquidity Management": {
        "implementation_cost_usd": 2_000.0,
        "monthly_fee_usd": 150.0,
        "annual_interest_rate": 0.045,
        "idle_balance_fraction": 0.30,
        "source_note": (
            "Assumes 30% of monthly cash deposits and ACH volume sits idle in a non-interest-bearing "
            "account, earning a 4.5% annual sweep/investment yield once activated — both are planning "
            "assumptions, not measured idle-balance data."
        ),
    },
    "Treasury Technology": {
        "implementation_cost_usd": 2_500.0,
        "monthly_fee_usd": 300.0,
        "labor_rate_per_hour_usd": 35.0,
        "base_hours_saved_per_month": 4.0,
        "hours_per_employee": 0.01,
        "source_note": (
            "Assumes 4 base hours/month of manual reconciliation eliminated, plus 0.01 hours per employee "
            "to account for multi-department complexity, at a $35/hour labor rate."
        ),
    },
    "Unknown": {
        "implementation_cost_usd": 0.0,
        "monthly_fee_usd": 0.0,
        "source_note": (
            "This product name didn't match a known category in the product catalog, so no cost/savings "
            "formula could be applied. Treat all figures as zero until the catalog mapping is fixed."
        ),
    },
}


def _resolve_category(product_name: str) -> str:
    normalized = product_name.strip().lower()
    for product in load_products():
        if product["name"].strip().lower() == normalized:
            return product["category"]
    return "Unknown"


def _build_assumptions(category: str) -> ROIAssumptions:
    a = CATEGORY_ASSUMPTIONS.get(category, CATEGORY_ASSUMPTIONS["Unknown"])
    return ROIAssumptions(
        category=category,
        implementation_cost_usd=a["implementation_cost_usd"],
        monthly_fee_usd=a["monthly_fee_usd"],
        labor_rate_per_hour_usd=a.get("labor_rate_per_hour_usd", 35.0),
        manual_check_cost_usd=a.get("manual_check_cost_usd", 0.0),
        fraud_loss_reduction_rate=a.get("fraud_loss_reduction_rate", 0.0),
        annual_interest_rate=a.get("annual_interest_rate", 0.0),
        source_note=a["source_note"],
    )


def compute_roi_for_recommendation(product_name: str, client: ClientProfile) -> ROIResult:
    category = _resolve_category(product_name)
    a = CATEGORY_ASSUMPTIONS.get(category, CATEGORY_ASSUMPTIONS["Unknown"])
    steps: list[str] = []
    monthly_savings = 0.0
    cost_avoidance = 0.0

    if category == "Fraud Prevention":
        baseline = FRAUD_LOSS_BASELINE[client.fraud_history]
        rate = a["fraud_loss_reduction_rate"]
        cost_avoidance = baseline * rate
        steps.append(f"Baseline annual fraud-loss exposure for '{client.fraud_history.value}' history = ${baseline:,.0f}")
        steps.append(f"Assumed fraud-loss reduction rate = {rate * 100:.0f}%")
        steps.append(f"Annual cost avoidance = ${baseline:,.0f} x {rate * 100:.0f}% = ${cost_avoidance:,.0f}")

    elif category == "Payments":
        avg_check_size = a["avg_check_size_usd"]
        check_count = client.monthly_check_volume / avg_check_size if avg_check_size else 0.0
        per_item_savings = a["manual_check_cost_usd"] - a["electronic_cost_per_item_usd"]
        monthly_savings = check_count * per_item_savings
        steps.append(f"Estimated check count = ${client.monthly_check_volume:,.0f} / ${avg_check_size:,.0f} avg check size ~= {check_count:,.0f} checks/month")
        steps.append(f"Per-item savings = ${a['manual_check_cost_usd']:.2f} manual - ${a['electronic_cost_per_item_usd']:.2f} electronic = ${per_item_savings:.2f}")
        steps.append(f"Monthly savings = {check_count:,.0f} checks x ${per_item_savings:.2f} = ${monthly_savings:,.0f}")

    elif category == "Receivables":
        avg_check_size = a["avg_check_size_usd"]
        check_count = client.monthly_check_volume / avg_check_size if avg_check_size else 0.0
        hours_saved = check_count * a["minutes_per_check"] / 60
        monthly_savings = hours_saved * a["labor_rate_per_hour_usd"]
        steps.append(f"Estimated check count = ${client.monthly_check_volume:,.0f} / ${avg_check_size:,.0f} avg check size ~= {check_count:,.0f} checks/month")
        steps.append(f"Labor hours saved = {check_count:,.0f} x {a['minutes_per_check']:.0f} min / 60 = {hours_saved:,.1f} hours/month")
        steps.append(f"Monthly savings = {hours_saved:,.1f} hours x ${a['labor_rate_per_hour_usd']:.2f}/hr = ${monthly_savings:,.0f}")

    elif category == "Cash Management":
        trips_saved = client.number_of_locations * a["trips_saved_per_location_per_month"]
        monthly_savings = trips_saved * a["cost_per_branch_trip_usd"]
        steps.append(f"Trips saved = {client.number_of_locations} locations x {a['trips_saved_per_location_per_month']:.0f} trips/month = {trips_saved:,.0f} trips/month")
        steps.append(f"Monthly savings = {trips_saved:,.0f} trips x ${a['cost_per_branch_trip_usd']:.2f}/trip = ${monthly_savings:,.0f}")

    elif category == "Liquidity Management":
        idle_balance = (client.monthly_cash_deposits + client.monthly_ach_volume) * a["idle_balance_fraction"]
        monthly_savings = idle_balance * a["annual_interest_rate"] / 12
        steps.append(f"Estimated idle balance = (${client.monthly_cash_deposits:,.0f} cash + ${client.monthly_ach_volume:,.0f} ACH) x {a['idle_balance_fraction'] * 100:.0f}% = ${idle_balance:,.0f}")
        steps.append(f"Monthly savings = ${idle_balance:,.0f} x {a['annual_interest_rate'] * 100:.1f}% annual yield / 12 = ${monthly_savings:,.0f}")

    elif category == "Treasury Technology":
        hours_saved = a["base_hours_saved_per_month"] + client.employee_count * a["hours_per_employee"]
        monthly_savings = hours_saved * a["labor_rate_per_hour_usd"]
        steps.append(f"Hours saved = {a['base_hours_saved_per_month']:.0f} base + ({client.employee_count} employees x {a['hours_per_employee']:.2f}) = {hours_saved:,.1f} hours/month")
        steps.append(f"Monthly savings = {hours_saved:,.1f} hours x ${a['labor_rate_per_hour_usd']:.2f}/hr = ${monthly_savings:,.0f}")

    else:
        steps.append(f"Product '{product_name}' did not match a known category in the product catalog — no formula applied.")

    annual_savings = monthly_savings * 12
    implementation_cost = a["implementation_cost_usd"]
    monthly_cost = a["monthly_fee_usd"]

    net_monthly_benefit = monthly_savings + (cost_avoidance / 12) - monthly_cost
    payback_period_months = implementation_cost / net_monthly_benefit if net_monthly_benefit > 0 else None

    year_1_net = annual_savings + cost_avoidance - (monthly_cost * 12) - implementation_cost
    roi_percentage_year_1 = (year_1_net / max(implementation_cost, 100.0)) * 100

    return ROIResult(
        product=product_name,
        category=category,
        monthly_savings_usd=round(monthly_savings, 2),
        annual_savings_usd=round(annual_savings, 2),
        cost_avoidance_usd=round(cost_avoidance, 2),
        implementation_cost_usd=implementation_cost,
        monthly_cost_usd=monthly_cost,
        payback_period_months=round(payback_period_months, 1) if payback_period_months is not None else None,
        roi_percentage_year_1=round(roi_percentage_year_1, 1),
        calculation_steps=steps,
        assumptions=_build_assumptions(category),
    )
