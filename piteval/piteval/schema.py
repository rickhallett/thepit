"""Pydantic models for evaluation output schema validation.

Matches the universal JSON output schema from 100-protocol.md exactly.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class MetricScore(BaseModel):
    """A single metric evaluation result."""

    id: str = Field(description="Metric ID, e.g. '101.1'")
    name: str = Field(description="Metric name, e.g. 'Module Boundary Clarity'")
    score: int = Field(ge=1, le=10, description="Integer score 1-10")
    justification: str = Field(min_length=10, description="Why this score was given")
    strongest_criticism: str = Field(min_length=10, description="Best argument for a lower score")
    strongest_defence: str = Field(min_length=10, description="Best argument for a higher score")
    evidence: list[str] = Field(min_length=1, description="Specific code references")

    @field_validator("score")
    @classmethod
    def score_must_be_integer(cls, v: int) -> int:
        if not isinstance(v, int):
            raise ValueError(f"Score must be integer, got {type(v).__name__}")
        return v


class RecommendedAction(BaseModel):
    """A prioritized recommended action from an evaluation."""

    priority: int = Field(ge=1, description="Priority rank (1 = highest)")
    action: str = Field(min_length=5, description="What to do")
    effort: Literal["low", "medium", "high"] = Field(description="Estimated effort")
    impact: Literal["low", "medium", "high"] = Field(description="Expected impact")


class PanelEvaluation(BaseModel):
    """Complete output from a single panel evaluation run.

    This is the universal output schema that every evaluator must produce.
    """

    panel_id: str = Field(description="Panel ID, e.g. '101'")
    panel_name: str = Field(description="Panel name, e.g. 'Architecture & Systems Design'")
    evaluator_model: str = Field(description="Model ID used for this evaluation")
    iteration: int = Field(ge=1, description="Iteration number (1-based)")
    temperature: float = Field(ge=0.0, le=2.0, description="Temperature used")
    timestamp: str = Field(description="ISO 8601 timestamp")
    metrics: list[MetricScore] = Field(min_length=1, description="Metric scores")
    overall_assessment: str = Field(min_length=20, description="2-3 sentence synthesis")
    top_3_strengths: list[str] = Field(min_length=1, max_length=5)
    top_3_risks: list[str] = Field(min_length=1, max_length=5)
    recommended_actions: list[RecommendedAction] = Field(min_length=1)

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp(cls, v: str) -> str:
        """Ensure timestamp is valid ISO 8601."""
        try:
            # Try parsing — accepts multiple ISO formats
            datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError as e:
            raise ValueError(f"Invalid ISO 8601 timestamp: {v}") from e
        return v


# --- Aggregation schema (Panel 113 output) ---


class ModelBias(BaseModel):
    mean_score: float
    bias_correction: float


class PanelComposite(BaseModel):
    panel_id: str
    panel_name: str
    composite_score: float
    confidence_interval: tuple[float, float]
    signal_tier: Literal["Signal", "Probable Signal", "Ambiguous", "Noise"]
    strongest_metric: MetricSummary | None = None
    weakest_metric: MetricSummary | None = None


class MetricSummary(BaseModel):
    id: str
    name: str
    score: float


class ConfirmedFinding(BaseModel):
    metric_id: str
    metric_name: str
    score: float
    icc: float
    evidence_summary: str


class KeyDisagreement(BaseModel):
    metric_id: str
    metric_name: str
    score_range: tuple[float, float]
    icc: float
    disagreement_summary: str


class ActionItem(BaseModel):
    rank: int
    action: str
    source_panels: list[str]
    expected_metric_impact: list[str]
    effort: Literal["hours", "days", "weeks"]
    rationale: str


class RadarChartData(BaseModel):
    labels: list[str]
    scores: list[float]


class GrandComposite(BaseModel):
    score: float
    confidence_interval: tuple[float, float]
    interpretation: str


class AggregationOutput(BaseModel):
    """Complete output from Panel 113 (Aggregation & Synthesis)."""

    meta: AggregationMeta
    model_biases: dict[str, ModelBias]
    panel_composites: list[PanelComposite]
    grand_composite: GrandComposite
    confirmed_strengths: list[ConfirmedFinding]
    confirmed_weaknesses: list[ConfirmedFinding]
    key_disagreements: list[KeyDisagreement]
    action_plan: list[ActionItem]
    radar_chart_data: RadarChartData
    narrative_summary: str


class AggregationMeta(BaseModel):
    total_evaluations_received: int
    conformance_rate: str
    excluded_evaluations: int
    models_represented: list[str]
    iterations_per_model: int
