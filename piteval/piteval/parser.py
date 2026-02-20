"""Parser — validates raw LLM output against the Pydantic schema.

Extracts JSON from the raw text (stripping markdown fences, preamble, etc.),
then validates against the PanelEvaluation schema.
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


def _extract_json(text: str) -> str:
    """Extract JSON from raw LLM output, handling common formatting issues."""
    text = text.strip()

    # Strip markdown code fences
    # ```json ... ``` or ``` ... ```
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

    # Step 3: Validate against Pydantic schema
    try:
        evaluation = PanelEvaluation.model_validate(raw_json)
    except ValidationError as e:
        error_messages = [f"{err['loc']}: {err['msg']}" for err in e.errors()]
        return ParseResult(
            run_id=run_id,
            success=False,
            raw_json=raw_json,
            errors=error_messages,
        )

    # Step 4: Cross-validation checks
    # Check that panel_id matches what we expect
    expected_panel = call_result.prompt.panel.panel_id
    if evaluation.panel_id != expected_panel:
        warnings.append(f"Panel ID mismatch: expected {expected_panel}, got {evaluation.panel_id}")

    # Check metric count
    expected_count = call_result.prompt.panel.metric_count
    actual_count = len(evaluation.metrics)
    if actual_count != expected_count:
        warnings.append(f"Metric count mismatch: expected {expected_count}, got {actual_count}")

    # Check metric IDs follow expected pattern (e.g., "101.1", "101.2", ...)
    for metric in evaluation.metrics:
        if not metric.id.startswith(f"{expected_panel}."):
            warnings.append(f"Metric ID {metric.id} doesn't match panel {expected_panel}")

    # Check iteration and temperature match
    if evaluation.iteration != call_result.prompt.iteration:
        warnings.append(
            f"Iteration mismatch: expected {call_result.prompt.iteration}, "
            f"got {evaluation.iteration}"
        )

    return ParseResult(
        run_id=run_id,
        success=True,
        evaluation=evaluation,
        raw_json=raw_json,
        warnings=warnings,
    )


def parse_batch(results: list[CallResult]) -> list[ParseResult]:
    """Parse a batch of call results."""
    return [parse_response(r) for r in results]


def parse_from_file(filepath: Path | str) -> ParseResult:
    """Parse a saved result file directly."""
    filepath = Path(filepath)
    try:
        data = json.loads(filepath.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as e:
        return ParseResult(
            run_id=filepath.stem,
            success=False,
            errors=[f"Failed to read file: {e}"],
        )

    raw_text = data.get("raw_text", "")

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

    try:
        evaluation = PanelEvaluation.model_validate(raw_json)
    except ValidationError as e:
        error_messages = [f"{err['loc']}: {err['msg']}" for err in e.errors()]
        return ParseResult(
            run_id=filepath.stem,
            success=False,
            raw_json=raw_json,
            errors=error_messages,
        )

    return ParseResult(
        run_id=filepath.stem,
        success=True,
        evaluation=evaluation,
        raw_json=raw_json,
    )


def load_all_evaluations(results_dir: Path | str) -> list[ParseResult]:
    """Load and parse all evaluation results from a directory."""
    results_dir = Path(results_dir)
    results: list[ParseResult] = []

    for filepath in sorted(results_dir.glob("*.json")):
        # Skip non-evaluation files (e.g., summary files)
        if filepath.stem.startswith("_"):
            continue
        result = parse_from_file(filepath)
        results.append(result)

    return results
