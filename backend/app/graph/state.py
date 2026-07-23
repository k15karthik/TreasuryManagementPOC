"""Shared state object threaded through every node of the LangGraph workflow."""
from typing import TypedDict

from app.models.agent_outputs import (
    ComplianceReport,
    ExecutiveSummary,
    NotRecommendedProduct,
    NeedsAssessment,
    ProfileAnalysis,
    Recommendation,
)
from app.models.client import ClientProfile


class GraphState(TypedDict, total=False):
    client: ClientProfile
    profile_analysis: ProfileAnalysis
    needs_assessment: NeedsAssessment
    recommendations: list[Recommendation]
    not_recommended: list[NotRecommendedProduct]
    compliance_report: ComplianceReport
    executive_summary: ExecutiveSummary
