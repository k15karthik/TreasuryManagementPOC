"""Input model for the client intake form."""
from enum import Enum

from pydantic import BaseModel, Field


class FraudHistory(str, Enum):
    NONE = "None"
    MINOR_INCIDENT = "Minor Incident"
    SIGNIFICANT_LOSS = "Significant Loss"
    ONGOING_CONCERN = "Ongoing Concern"


class ClientProfile(BaseModel):
    """Raw data captured on the client intake form."""

    company_name: str = Field(..., description="Legal or DBA name of the client business")
    industry: str = Field(..., description="Primary industry / vertical")
    annual_revenue: float = Field(..., description="Annual revenue in USD")
    employee_count: int = Field(..., description="Total number of employees")
    number_of_locations: int = Field(..., description="Number of physical business locations")
    current_banking_products: list[str] = Field(default_factory=list, description="Products the client already uses")
    current_pain_points: list[str] = Field(default_factory=list, description="Pain points described by the client")
    erp_system: str = Field(default="", description="ERP / accounting system in use, if any")
    current_payment_methods: list[str] = Field(default_factory=list, description="Payment methods currently used")
    monthly_ach_volume: float = Field(default=0, description="Monthly ACH dollar volume in USD")
    monthly_wire_volume: float = Field(default=0, description="Monthly wire dollar volume in USD")
    monthly_check_volume: float = Field(default=0, description="Monthly check dollar volume in USD")
    monthly_cash_deposits: float = Field(default=0, description="Monthly cash deposit dollar volume in USD")
    fraud_history: FraudHistory = Field(default=FraudHistory.NONE, description="Client's fraud incident history")
    growth_plans: str = Field(default="", description="Narrative description of expansion / growth plans")
