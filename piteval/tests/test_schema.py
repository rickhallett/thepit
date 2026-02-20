"""Tests for Pydantic schema validation.

These test that the schema rejects what it should reject and accepts what
it should accept — behavioral tests, not tautological ones.
"""

import pytest
from pydantic import ValidationError

from piteval.schema import MetricScore, PanelEvaluation, RecommendedAction


def _valid_metric(**overrides) -> dict:
    base = {
        "id": "101.1",
        "name": "Module Boundary Clarity",
        "score": 7,
        "justification": "Clear separation between modules with well-defined interfaces.",
        "strongest_criticism": "bout-engine imports from many modules creating high fan-in.",
        "strongest_defence": "Fan-in is intentional for the orchestration layer.",
        "evidence": ["lib/ directory structure"],
    }
    base.update(overrides)
    return base


def _valid_evaluation(**overrides) -> dict:
    base = {
        "panel_id": "101",
        "panel_name": "Architecture & Systems Design",
        "evaluator_model": "claude-opus-4",
        "iteration": 1,
        "temperature": 0.6,
        "timestamp": "2026-02-20T10:00:00Z",
        "metrics": [_valid_metric()],
        "overall_assessment": (
            "This is a well-structured codebase with clear separation of concerns."
        ),
        "top_3_strengths": ["Modular design", "Clear data flow", "Good error handling"],
        "top_3_risks": ["High fan-in in bout-engine", "Some leaky abstractions", "Config sprawl"],
        "recommended_actions": [
            {
                "priority": 1,
                "action": "Extract credit lifecycle from bout-engine",
                "effort": "medium",
                "impact": "high",
            }
        ],
    }
    base.update(overrides)
    return base


class TestMetricScore:
    def test_valid_metric_passes(self):
        MetricScore(**_valid_metric())

    def test_score_below_1_rejected(self):
        with pytest.raises(ValidationError):
            MetricScore(**_valid_metric(score=0))

    def test_score_above_10_rejected(self):
        with pytest.raises(ValidationError):
            MetricScore(**_valid_metric(score=11))

    def test_score_float_rejected(self):
        with pytest.raises(ValidationError):
            MetricScore(**_valid_metric(score=7.5))

    def test_empty_evidence_rejected(self):
        with pytest.raises(ValidationError):
            MetricScore(**_valid_metric(evidence=[]))

    def test_short_justification_rejected(self):
        with pytest.raises(ValidationError):
            MetricScore(**_valid_metric(justification="Short"))


class TestRecommendedAction:
    def test_valid_action_passes(self):
        RecommendedAction(priority=1, action="Do the thing", effort="medium", impact="high")

    def test_invalid_effort_rejected(self):
        with pytest.raises(ValidationError):
            RecommendedAction(priority=1, action="Do the thing", effort="very high", impact="high")

    def test_priority_zero_rejected(self):
        with pytest.raises(ValidationError):
            RecommendedAction(priority=0, action="Do the thing", effort="low", impact="low")


class TestPanelEvaluation:
    def test_valid_evaluation_passes(self):
        PanelEvaluation(**_valid_evaluation())

    def test_invalid_timestamp_rejected(self):
        with pytest.raises(ValidationError):
            PanelEvaluation(**_valid_evaluation(timestamp="not-a-date"))

    def test_iso_timestamp_with_z_suffix_accepted(self):
        PanelEvaluation(**_valid_evaluation(timestamp="2026-02-20T10:00:00Z"))

    def test_iso_timestamp_with_offset_accepted(self):
        PanelEvaluation(**_valid_evaluation(timestamp="2026-02-20T10:00:00+00:00"))

    def test_empty_metrics_rejected(self):
        with pytest.raises(ValidationError):
            PanelEvaluation(**_valid_evaluation(metrics=[]))

    def test_empty_recommended_actions_rejected(self):
        with pytest.raises(ValidationError):
            PanelEvaluation(**_valid_evaluation(recommended_actions=[]))

    def test_short_assessment_rejected(self):
        with pytest.raises(ValidationError):
            PanelEvaluation(**_valid_evaluation(overall_assessment="Short."))
