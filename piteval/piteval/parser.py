"""Parser — normalizes diverse LLM output and validates against the schema.

LLMs produce wildly different JSON structures even with explicit schema
instructions. This parser handles:

1. JSON extraction (markdown fences, preamble, trailing content)
2. Field name normalization (metric_id → id, reasoning → justification, etc.)
3. Container normalization (scores → metrics)
4. Envelope metadata injection (iteration, temperature, timestamp from caller)
5. Pydantic validation against the relaxed schema

The normalizer is empirically derived from Pilot 1 output variance across
Claude Sonnet 4.6, GPT-5.2, and Gemini 2.5 Pro.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Any

from pydantic import ValidationError

from .schema import PanelEvaluation

if TYPE_CHECKING:
    from .caller import CallResult


@dataclass
class ParseResult:
    """Result of parsing a raw LLM response."""

    run_id: str
    success: bool
    evaluation: PanelEvaluation | None = None
    raw_json: dict[str, Any] | None = None
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def __repr__(self) -> str:
        status = "OK" if self.success else f"FAIL ({len(self.errors)} errors)"
        return f"ParseResult({self.run_id}: {status})"


# --- JSON extraction ---


def _extract_json(text: str) -> str:
    """Extract JSON from raw LLM output, handling common formatting issues."""
    text = text.strip()

    # Strip markdown code fences
    fence_pattern = re.compile(r"^```(?:json)?\s*\n?(.*?)\n?```\s*$", re.DOTALL)
    match = fence_pattern.match(text)
    if match:
        text = match.group(1).strip()

    # If text starts with commentary before JSON, find the first {
    if not text.startswith("{"):
        brace_idx = text.find("{")
        if brace_idx >= 0:
            text = text[brace_idx:]

    # If text has trailing content after the JSON, find the matching }
    if text.startswith("{"):
        depth = 0
        in_string = False
        escape = False
        end_idx = -1
        for i, ch in enumerate(text):
            if escape:
                escape = False
                continue
            if ch == "\\":
                escape = True
                continue
            if ch == '"' and not escape:
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    end_idx = i
                    break
        if end_idx >= 0:
            text = text[: end_idx + 1]

    return text


# --- Field name normalization ---

# Metric field name mapping: variant → canonical
_METRIC_FIELD_MAP: dict[str, str] = {
    "metric_id": "id",
    "metric_name": "name",
    "reasoning": "justification",
    "summary": "justification",
    "details": "justification",
    "description": "justification",
    "criticism": "strongest_criticism",
    "criticisms": "strongest_criticism",
    "weaknesses": "strongest_criticism",
    "defence": "strongest_defence",
    "defense": "strongest_defence",
    "defences": "strongest_defence",
    "defenses": "strongest_defence",
    "strengths": "strongest_defence",
    "risks": "strongest_criticism",
}


def _normalize_metric(raw: dict[str, Any], panel_id: str, index: int) -> dict[str, Any]:
    """Normalize a single metric dict to canonical field names."""
    normalized: dict[str, Any] = {}

    for key, value in raw.items():
        canonical = _METRIC_FIELD_MAP.get(key, key)
        # If we already have this canonical key, don't overwrite with a variant
        if canonical not in normalized:
            normalized[canonical] = value

    # Ensure id exists — synthesize from panel_id + index if missing
    if "id" not in normalized:
        normalized["id"] = f"{panel_id}.{index + 1}"

    # If evidence is a string, wrap in list
    if isinstance(normalized.get("evidence"), str):
        normalized["evidence"] = [normalized["evidence"]]

    # If strongest_criticism/defence is a list, join to string
    for field_name in ("strongest_criticism", "strongest_defence"):
        val = normalized.get(field_name)
        if isinstance(val, list):
            normalized[field_name] = "; ".join(str(v) for v in val)

    return normalized


def _normalize_llm_output(
    raw: dict[str, Any],
    envelope: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Normalize diverse LLM output into the canonical schema shape.

    Handles:
    - 'scores' → 'metrics' container rename
    - Per-metric field name normalization
    - Envelope metadata injection
    - Missing optional field defaults
    """
    result = dict(raw)
    panel_id = result.get("panel_id", "")

    # --- Container normalization ---
    # Some models use "scores" instead of "metrics" (as a list of dicts)
    if "metrics" not in result and "scores" in result:
        scores = result.get("scores")
        if isinstance(scores, list) and scores and isinstance(scores[0], dict):
            result["metrics"] = result.pop("scores")

    # Some models use "evaluations" instead of "metrics"
    if "metrics" not in result and "evaluations" in result:
        evals = result.get("evaluations")
        if isinstance(evals, list) and evals and isinstance(evals[0], dict):
            result["metrics"] = result.pop("evaluations")

    # --- Handle dict-shaped scores ---
    # LLMs sometimes produce scores as dicts keyed by metric ID:
    #   Format A: {"105.1": {"score": 5, "reasoning": "..."}} (dict of dicts)
    #   Format B: {"106.1": 7, "106.2": 5} (dict of plain ints)
    if "metrics" not in result:
        for key in ("scores", "metric_scores"):
            val = result.get(key)
            if isinstance(val, dict) and val:
                metrics = []
                for metric_id, entry in val.items():
                    if isinstance(entry, dict) and "score" in entry:
                        # Format A: dict of dicts with score + metadata
                        m = dict(entry)
                        m["id"] = str(metric_id)
                        metrics.append(m)
                    elif isinstance(entry, (int, float)):
                        # Format B: dict of plain scores
                        metrics.append({"id": str(metric_id), "score": int(entry)})
                if metrics:
                    result["metrics"] = metrics
                    if key != "metrics":
                        result.pop(key, None)
                    break

    # --- Normalize individual metrics ---
    if "metrics" in result and isinstance(result["metrics"], list):
        result["metrics"] = [
            _normalize_metric(m, panel_id, i)
            for i, m in enumerate(result["metrics"])
            if isinstance(m, dict) and "score" in m
        ]

    # --- Inject envelope metadata ---
    if envelope:
        if "evaluator_model" not in result or not result["evaluator_model"]:
            result["evaluator_model"] = envelope.get("model_requested", "")
        if "iteration" not in result:
            result["iteration"] = envelope.get("iteration", 1)
        if "temperature" not in result:
            result["temperature"] = envelope.get("temperature", 0.0)
        if "timestamp" not in result or not result["timestamp"]:
            result["timestamp"] = envelope.get("timestamp", "")
        if "panel_name" not in result or not result["panel_name"]:
            result["panel_name"] = envelope.get("panel_name", "")

    # --- Top-level field normalization ---
    # overall_summary → overall_assessment
    if "overall_assessment" not in result:
        for alt in ("overall_summary", "summary", "assessment", "overall"):
            if alt in result:
                result["overall_assessment"] = result.pop(alt)
                break

    # Coerce null/non-string overall_assessment to empty string
    if not isinstance(result.get("overall_assessment"), str):
        result["overall_assessment"] = str(result.get("overall_assessment") or "")

    # recommendations → recommended_actions
    if "recommended_actions" not in result:
        for alt in ("recommendations", "actions", "action_items"):
            if alt in result and isinstance(result[alt], list):
                result["recommended_actions"] = result.pop(alt)
                break

    # Normalize recommended_actions items
    if isinstance(result.get("recommended_actions"), list):
        normalized_actions = []
        for i, action in enumerate(result["recommended_actions"]):
            if isinstance(action, dict):
                # Normalize action field names
                a = dict(action)
                if "action" not in a:
                    for alt in ("description", "title", "recommendation"):
                        if alt in a:
                            a["action"] = a[alt]
                            break
                if "priority" not in a:
                    a["priority"] = i + 1
                normalized_actions.append(a)
            elif isinstance(action, str):
                normalized_actions.append({"priority": i + 1, "action": action})
        result["recommended_actions"] = normalized_actions

    return result


# --- Public API ---


def parse_response(call_result: CallResult) -> ParseResult:
    """Parse and validate a single API call result."""
    run_id = call_result.run_id
    raw_text = call_result.raw_text
    warnings: list[str] = []

    # Step 1: Extract JSON
    try:
        json_str = _extract_json(raw_text)
    except Exception as e:
        return ParseResult(
            run_id=run_id,
            success=False,
            errors=[f"Failed to extract JSON: {e}"],
        )

    # Step 2: Parse JSON
    try:
        raw_json = json.loads(json_str)
    except json.JSONDecodeError as e:
        return ParseResult(
            run_id=run_id,
            success=False,
            errors=[f"Invalid JSON: {e}"],
        )

    # Step 3: Build envelope from call_result
    envelope = {
        "model_requested": call_result.prompt.model.api_model_id,
        "iteration": call_result.prompt.iteration,
        "temperature": call_result.prompt.temperature,
        "timestamp": call_result.timestamp,
        "panel_name": call_result.prompt.panel.name,
    }

    # Step 4: Normalize
    normalized = _normalize_llm_output(raw_json, envelope)

    # Step 5: Validate against Pydantic schema
    try:
        evaluation = PanelEvaluation.model_validate(normalized)
    except ValidationError as e:
        error_messages = [f"{err['loc']}: {err['msg']}" for err in e.errors()]
        return ParseResult(
            run_id=run_id,
            success=False,
            raw_json=normalized,
            errors=error_messages,
        )

    # Step 6: Cross-validation checks
    expected_panel = call_result.prompt.panel.panel_id
    if evaluation.panel_id != expected_panel:
        warnings.append(f"Panel ID mismatch: expected {expected_panel}, got {evaluation.panel_id}")

    expected_count = call_result.prompt.panel.metric_count
    actual_count = len(evaluation.metrics)
    if actual_count != expected_count:
        warnings.append(f"Metric count mismatch: expected {expected_count}, got {actual_count}")

    for metric in evaluation.metrics:
        if not metric.id.startswith(f"{expected_panel}."):
            warnings.append(f"Metric ID {metric.id} doesn't match panel {expected_panel}")

    return ParseResult(
        run_id=run_id,
        success=True,
        evaluation=evaluation,
        raw_json=normalized,
        warnings=warnings,
    )


def parse_batch(results: list[CallResult]) -> list[ParseResult]:
    """Parse a batch of call results."""
    return [parse_response(r) for r in results]


def parse_from_file(filepath: Path | str) -> ParseResult:
    """Parse a saved result file directly.

    Reads the envelope (caller metadata) and raw_text (LLM output),
    normalizes the LLM JSON, injects envelope metadata, and validates.
    """
    filepath = Path(filepath)
    try:
        envelope = json.loads(filepath.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as e:
        return ParseResult(
            run_id=filepath.stem,
            success=False,
            errors=[f"Failed to read file: {e}"],
        )

    raw_text = envelope.get("raw_text", "")

    # Extract and parse the JSON from the raw text
    try:
        json_str = _extract_json(raw_text)
        raw_json = json.loads(json_str)
    except (json.JSONDecodeError, Exception) as e:
        return ParseResult(
            run_id=filepath.stem,
            success=False,
            errors=[f"Failed to parse JSON from raw_text: {e}"],
        )

    # Normalize using the envelope
    normalized = _normalize_llm_output(raw_json, envelope)

    try:
        evaluation = PanelEvaluation.model_validate(normalized)
    except ValidationError as e:
        error_messages = [f"{err['loc']}: {err['msg']}" for err in e.errors()]
        return ParseResult(
            run_id=filepath.stem,
            success=False,
            raw_json=normalized,
            errors=error_messages,
        )

    warnings: list[str] = []

    # Cross-check metric count against known panel definitions
    try:
        from .models import get_panel

        panel = get_panel(evaluation.panel_id)
        if len(evaluation.metrics) != panel.metric_count:
            warnings.append(
                f"Metric count: expected {panel.metric_count}, got {len(evaluation.metrics)}"
            )
    except ValueError:
        pass

    return ParseResult(
        run_id=filepath.stem,
        success=True,
        evaluation=evaluation,
        raw_json=normalized,
        warnings=warnings,
    )


def load_all_evaluations(results_dir: Path | str) -> list[ParseResult]:
    """Load and parse all evaluation results from a directory."""
    results_dir = Path(results_dir)
    results: list[ParseResult] = []

    for filepath in sorted(results_dir.glob("*.json")):
        # Skip non-evaluation files (e.g., summary files, .gitkeep)
        if filepath.stem.startswith("_") or filepath.stem.startswith("."):
            continue
        result = parse_from_file(filepath)
        results.append(result)

    return results
