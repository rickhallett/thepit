"""Pydantic models for evaluation output schema validation.

Relaxed schema that accommodates real LLM output variance while preserving
the fields that matter for statistical analysis (panel_id, metric scores).

Metadata fields (iteration, temperature, timestamp, evaluator_model) are
injected by the parser from the result envelope, not expected from LLM output.

Field name normalization happens in parser.py before validation.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class MetricScore(BaseModel):
    """A single metric evaluation result.

    Only id and score are strictly required. LLMs produce wildly different
    field names for justification, criticism, etc. — the parser normalizes
    these before validation, but if normalization fails the field is optional.
    """

    id: str = Field(description="Metric ID, e.g. '101.1'")
    name: str = Field(default="", description="Metric name (optional, some models omit)")
    score: int = Field(ge=1, le=10, description="Integer score 1-10")
    justification: str = Field(default="", description="Why this score was given")
    strongest_criticism: str = Field(default="", description="Best argument for a lower score")
    strongest_defence: str = Field(default="", description="Best argument for a higher score")
    evidence: list[str] = Field(default_factory=list, description="Specific code references")

    @field_validator("score")
    @classmethod
    def score_must_be_integer(cls, v: int) -> int:
        if not isinstance(v, int):
            raise ValueError(f"Score must be integer, got {type(v).__name__}")
        return v


class RecommendedAction(BaseModel):
    """A prioritized recommended action from an evaluation."""

    priority: int | str = Field(default=0, description="Priority rank")
    action: str = Field(default="", description="What to do")
    effort: str = Field(default="", description="Estimated effort")
    impact: str = Field(default="", description="Expected impact")


class PanelEvaluation(BaseModel):
    """Complete output from a single panel evaluation run.

    Core required fields: panel_id, evaluator_model, iteration, temperature,
    timestamp, metrics (with at least id + score per metric).

    Everything else is best-effort — LLMs don't reliably produce identical
    schemas even with explicit instructions.
    """

    panel_id: str = Field(description="Panel ID, e.g. '101'")
    panel_name: str = Field(default="", description="Panel name")
    evaluator_model: str = Field(description="Model ID used for this evaluation")
    iteration: int = Field(ge=1, description="Iteration number (1-based)")
    temperature: float = Field(ge=0.0, le=2.0, description="Temperature used")
    timestamp: str = Field(description="ISO 8601 timestamp")
    metrics: list[MetricScore] = Field(min_length=1, description="Metric scores")
    overall_assessment: str = Field(default="", description="2-3 sentence synthesis")
    top_3_strengths: list[str] = Field(default_factory=list)
    top_3_risks: list[str] = Field(default_factory=list)
    recommended_actions: list[RecommendedAction] = Field(default_factory=list)

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp(cls, v: str) -> str:
        """Ensure timestamp is valid ISO 8601."""
        try:
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
