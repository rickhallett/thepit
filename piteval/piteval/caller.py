"""API caller — sends assembled prompts to LLM providers sequentially.

Handles retries, rate limits, and saves raw responses to disk.
Sequential by design: quality of compute over speed.
"""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any

from dotenv import load_dotenv

from .models import ModelProvider

if TYPE_CHECKING:
    from .assembler import AssembledPrompt

# Max retries per API call
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 10


def _load_api_key(env_var: str) -> str:
    """Load an API key from environment, with .env fallback."""
    # Try loading from .env files in common locations
    for env_path in [".env", "../.env", "../../.env"]:
        load_dotenv(env_path, override=False)

    key = os.environ.get(env_var)
    if not key:
        raise OSError(f"Missing API key: {env_var}. Set it in your environment or .env file.")
    return key


def _call_anthropic(prompt: AssembledPrompt, api_key: str) -> dict[str, Any]:
    """Call Anthropic's Messages API.

    Uses the context-1m-2025-08-07 beta header to enable 1M context window.
    Long-context pricing applies automatically when input exceeds 200K tokens.
    See: docs/eval-briefs/002-long-context-cost-decision.md
    """
    import anthropic

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model=prompt.model.api_model_id,
        max_tokens=prompt.model.max_output_tokens,
        temperature=prompt.temperature,
        system=prompt.system,
        messages=[{"role": "user", "content": prompt.user}],
        extra_headers={"anthropic-beta": "context-1m-2025-08-07"},
    )

    # Extract text content
    text = ""
    for block in response.content:
        if hasattr(block, "text"):
            text += block.text

    return {
        "raw_text": text,
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "stop_reason": response.stop_reason,
        "model": response.model,
    }


def _call_openai(prompt: AssembledPrompt, api_key: str) -> dict[str, Any]:
    """Call OpenAI's Chat Completions API."""
    import openai

    client = openai.OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=prompt.model.api_model_id,
        max_tokens=prompt.model.max_output_tokens,
        temperature=prompt.temperature,
        messages=[
            {"role": "system", "content": prompt.system},
            {"role": "user", "content": prompt.user},
        ],
    )

    choice = response.choices[0]
    usage = response.usage

    return {
        "raw_text": choice.message.content or "",
        "input_tokens": usage.prompt_tokens if usage else 0,
        "output_tokens": usage.completion_tokens if usage else 0,
        "stop_reason": choice.finish_reason,
        "model": response.model,
    }


def _call_google(prompt: AssembledPrompt, api_key: str) -> dict[str, Any]:
    """Call Google's Gemini API via google-genai."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=prompt.model.api_model_id,
        contents=prompt.user,
        config=types.GenerateContentConfig(
            system_instruction=prompt.system,
            temperature=prompt.temperature,
            max_output_tokens=prompt.model.max_output_tokens,
            response_mime_type="application/json",
        ),
    )

    text = response.text or ""
    usage_meta = response.usage_metadata

    return {
        "raw_text": text,
        "input_tokens": getattr(usage_meta, "prompt_token_count", 0) or 0,
        "output_tokens": getattr(usage_meta, "candidates_token_count", 0) or 0,
        "stop_reason": "stop",
        "model": prompt.model.api_model_id,
    }


_PROVIDER_CALLERS = {
    ModelProvider.ANTHROPIC: _call_anthropic,
    ModelProvider.OPENAI: _call_openai,
    ModelProvider.GOOGLE: _call_google,
}


class CallResult:
    """Result from a single API call."""

    def __init__(
        self,
        prompt: AssembledPrompt,
        raw_text: str,
        input_tokens: int,
        output_tokens: int,
        stop_reason: str,
        model_reported: str,
        duration_seconds: float,
        timestamp: str,
        attempt: int,
    ) -> None:
        self.prompt = prompt
        self.raw_text = raw_text
        self.input_tokens = input_tokens
        self.output_tokens = output_tokens
        self.stop_reason = stop_reason
        self.model_reported = model_reported
        self.duration_seconds = duration_seconds
        self.timestamp = timestamp
        self.attempt = attempt

    @property
    def cost(self) -> float:
        """Compute actual cost in USD, accounting for long-context pricing.

        When a model has a long_context_threshold and the input exceeds it,
        ALL tokens (not just those above the threshold) are billed at
        the premium rate. This matches Anthropic's billing model.
        """
        model = self.prompt.model
        threshold = model.long_context_threshold
        if threshold > 0 and self.input_tokens > threshold:
            input_rate = model.long_context_input_cost_per_mtok
            output_rate = model.long_context_output_cost_per_mtok
        else:
            input_rate = model.input_cost_per_mtok
            output_rate = model.output_cost_per_mtok
        input_cost = (self.input_tokens / 1_000_000) * input_rate
        output_cost = (self.output_tokens / 1_000_000) * output_rate
        return input_cost + output_cost

    @property
    def run_id(self) -> str:
        return self.prompt.run_id

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a dict for JSON storage."""
        return {
            "run_id": self.run_id,
            "panel_id": self.prompt.panel.panel_id,
            "panel_name": self.prompt.panel.name,
            "model_requested": self.prompt.model.api_model_id,
            "model_reported": self.model_reported,
            "iteration": self.prompt.iteration,
            "temperature": self.prompt.temperature,
            "timestamp": self.timestamp,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "cost_usd": round(self.cost, 4),
            "duration_seconds": round(self.duration_seconds, 2),
            "stop_reason": self.stop_reason,
            "attempt": self.attempt,
            "sections_included": self.prompt.included_sections,
            "optional_included": self.prompt.optional_included,
            "raw_text": self.raw_text,
        }

    def __repr__(self) -> str:
        return (
            f"CallResult({self.run_id}, "
            f"tokens={self.input_tokens}+{self.output_tokens}, "
            f"cost=${self.cost:.4f}, "
            f"{self.duration_seconds:.1f}s)"
        )


class Caller:
    """Sends assembled prompts to LLM providers sequentially."""

    def __init__(self, results_dir: Path | str) -> None:
        self.results_dir = Path(results_dir).resolve()
        self.results_dir.mkdir(parents=True, exist_ok=True)
        self._api_keys: dict[str, str] = {}

    def _get_api_key(self, env_var: str) -> str:
        """Get (and cache) an API key."""
        if env_var not in self._api_keys:
            self._api_keys[env_var] = _load_api_key(env_var)
        return self._api_keys[env_var]

    def call(self, prompt: AssembledPrompt) -> CallResult:
        """Execute a single evaluation call with retries."""
        api_key = self._get_api_key(prompt.model.env_var)
        caller_fn = _PROVIDER_CALLERS[prompt.model.provider]

        last_error: Exception | None = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                _log(
                    f"  [{attempt}/{MAX_RETRIES}] Calling {prompt.model.display_name} "
                    f"for panel {prompt.panel.panel_id} iter {prompt.iteration} "
                    f"(temp={prompt.temperature})..."
                )
                start = time.monotonic()
                timestamp = datetime.now(UTC).isoformat()

                result_data = caller_fn(prompt, api_key)

                duration = time.monotonic() - start

                call_result = CallResult(
                    prompt=prompt,
                    raw_text=result_data["raw_text"],
                    input_tokens=result_data["input_tokens"],
                    output_tokens=result_data["output_tokens"],
                    stop_reason=result_data["stop_reason"],
                    model_reported=result_data["model"],
                    duration_seconds=duration,
                    timestamp=timestamp,
                    attempt=attempt,
                )

                _log(f"  -> {call_result}")
                self._save_result(call_result)
                return call_result

            except Exception as e:
                last_error = e
                _log(f"  -> ERROR (attempt {attempt}): {e}")
                if attempt < MAX_RETRIES:
                    delay = RETRY_DELAY_SECONDS * attempt
                    _log(f"  -> Retrying in {delay}s...")
                    time.sleep(delay)

        raise RuntimeError(
            f"All {MAX_RETRIES} attempts failed for {prompt.run_id}: {last_error}"
        ) from last_error

    def call_batch(self, prompts: list[AssembledPrompt]) -> list[CallResult]:
        """Execute a batch of prompts sequentially."""
        results: list[CallResult] = []
        total = len(prompts)
        total_cost = 0.0

        _log(f"\n{'=' * 60}")
        _log(f"Starting batch: {total} evaluation runs")
        _log(f"{'=' * 60}\n")

        for i, prompt in enumerate(prompts, 1):
            _log(f"\n[{i}/{total}] {prompt}")

            # Check if result already exists (resume support)
            existing = self._load_existing(prompt.run_id)
            if existing:
                _log("  -> Cached result found, skipping.")
                # Reconstruct a minimal CallResult for tracking
                results.append(existing)
                total_cost += existing.cost
                continue

            result = self.call(prompt)
            results.append(result)
            total_cost += result.cost
            _log(f"  -> Cumulative cost: ${total_cost:.2f}")

        _log(f"\n{'=' * 60}")
        _log(f"Batch complete: {len(results)}/{total} runs, total cost: ${total_cost:.2f}")
        _log(f"{'=' * 60}\n")

        return results

    def _save_result(self, result: CallResult) -> Path:
        """Save a call result to disk as JSON."""
        filename = f"{result.run_id}.json"
        filepath = self.results_dir / filename
        filepath.write_text(
            json.dumps(result.to_dict(), indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        return filepath

    def _load_existing(self, run_id: str) -> CallResult | None:
        """Check if a result already exists on disk (for resume support)."""
        filepath = self.results_dir / f"{run_id}.json"
        if not filepath.exists():
            return None

        try:
            data = json.loads(filepath.read_text(encoding="utf-8"))
            # Create a minimal CallResult for resume tracking
            # We don't reconstruct the full prompt, but we have the data we need
            return _reconstruct_result(data)
        except (json.JSONDecodeError, KeyError):
            return None


def _reconstruct_result(data: dict[str, Any]) -> CallResult:
    """Reconstruct a CallResult from saved JSON data.

    This is used for resume support — we create a lightweight result
    from the saved data without needing the original AssembledPrompt.
    """
    from .models import get_model, get_panel

    model = get_model(data["model_requested"])
    panel = get_panel(data["panel_id"])

    # Create a stub prompt for the result
    class _StubPrompt:
        def __init__(self, p: Any, m: Any, i: int, t: float, secs: list[str], opt: bool) -> None:
            self.panel = p
            self.model = m
            self.iteration = i
            self.temperature = t
            self.included_sections = secs
            self.optional_included = opt

        @property
        def run_id(self) -> str:
            model_short = self.model.api_model_id.replace("/", "_")
            return f"{self.panel.panel_id}_{model_short}_iter{self.iteration}"

    stub = _StubPrompt(
        panel,
        model,
        data["iteration"],
        data["temperature"],
        data.get("sections_included", []),
        data.get("optional_included", True),
    )

    return CallResult(
        prompt=stub,  # type: ignore[arg-type]
        raw_text=data["raw_text"],
        input_tokens=data["input_tokens"],
        output_tokens=data["output_tokens"],
        stop_reason=data["stop_reason"],
        model_reported=data.get("model_reported", data["model_requested"]),
        duration_seconds=data.get("duration_seconds", 0.0),
        timestamp=data.get("timestamp", ""),
        attempt=data.get("attempt", 1),
    )


def _log(msg: str) -> None:
    """Log to stderr for progress visibility."""
    print(msg, file=sys.stderr, flush=True)
