"""Prompt assembler — reads XML panel prompts and injects codebase sections.

For each panel + model + iteration, produces the final prompt string ready
to send to the LLM API.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .bundler import BundledSection, Bundler
    from .models import ModelConfig, PanelDef

_SYSTEM_PREAMBLE = """\
You are an expert codebase evaluator. You will analyze a codebase according to \
the evaluation panel instructions below. You MUST return your evaluation as a \
single JSON object conforming to the exact schema specified.

CRITICAL REQUIREMENTS:
1. All metric scores MUST be integers 1-10. No half-points.
2. Every field in the schema is required. Do not omit any field.
3. Return ONLY the JSON object. No markdown fences, no commentary before or after.
4. The "evidence" array must reference specific files or code patterns you observed.
5. Be honest. If something is bad, say so. If something is good, say so.

CONTEXT CALIBRATION:
- This is a solo-developer project built in under two weeks.
- A score of 5-6 = "what a competent solo developer would produce under time pressure."
- A score of 9-10 = "what a well-resourced team would produce with months of iteration."
"""


def _build_codebase_block(sections: list[BundledSection]) -> str:
    """Format codebase sections into a single context block."""
    parts: list[str] = []
    for section in sections:
        parts.append(
            f'<codebase-section id="{section.section_id}" '
            f'label="{section.label}" '
            f'files="{section.file_count}" '
            f'tokens="{section.token_count:,}">\n'
            f"{section.content}\n"
            f"</codebase-section>"
        )
    return "\n\n".join(parts)


def _build_iteration_metadata(
    model: ModelConfig,
    panel: PanelDef,
    iteration: int,
    temperature: float,
) -> str:
    """Build the iteration metadata block for the prompt."""
    return (
        f"<evaluation-metadata>\n"
        f"  <panel_id>{panel.panel_id}</panel_id>\n"
        f"  <panel_name>{panel.name}</panel_name>\n"
        f"  <evaluator_model>{model.api_model_id}</evaluator_model>\n"
        f"  <iteration>{iteration}</iteration>\n"
        f"  <temperature>{temperature}</temperature>\n"
        f"</evaluation-metadata>"
    )


class Assembler:
    """Assembles final prompts by combining panel XML + codebase sections."""

    def __init__(
        self,
        prompts_dir: Path | str,
        bundler: Bundler,
    ) -> None:
        self.prompts_dir = Path(prompts_dir).resolve()
        self.bundler = bundler
        self._prompt_cache: dict[str, str] = {}

    def _read_panel_prompt(self, panel: PanelDef) -> str:
        """Read and cache a panel's XML prompt file."""
        if panel.panel_id in self._prompt_cache:
            return self._prompt_cache[panel.panel_id]

        prompt_file = self.prompts_dir / panel.prompt_file
        if not prompt_file.exists():
            raise FileNotFoundError(f"Panel prompt not found: {prompt_file}")

        content = prompt_file.read_text(encoding="utf-8")

        # Strip CDATA wrapper if present (our XML files use it)
        if content.startswith("<![CDATA["):
            content = content[len("<![CDATA[") :]
        if content.rstrip().endswith("]]>"):
            content = content.rstrip()[:-3]

        self._prompt_cache[panel.panel_id] = content.strip()
        return self._prompt_cache[panel.panel_id]

    def _gather_sections(
        self,
        panel: PanelDef,
        include_optional: bool = True,
    ) -> list[BundledSection]:
        """Gather required (and optionally, optional) sections for a panel."""
        section_ids = list(panel.required_sections)
        if include_optional:
            section_ids.extend(panel.optional_sections)
        # Deduplicate while preserving order
        seen: set[str] = set()
        unique: list[str] = []
        for sid in section_ids:
            if sid not in seen:
                seen.add(sid)
                unique.append(sid)
        return self.bundler.bundle_sections(unique)

    def estimate_prompt_tokens(
        self,
        panel: PanelDef,
        include_optional: bool = True,
    ) -> int:
        """Estimate total input tokens for a panel prompt."""
        sections = self._gather_sections(panel, include_optional)
        codebase_tokens = sum(s.token_count for s in sections)
        panel_prompt = self._read_panel_prompt(panel)
        prompt_tokens = self.bundler.count_tokens(panel_prompt)
        preamble_tokens = self.bundler.count_tokens(_SYSTEM_PREAMBLE)
        # Add ~200 tokens for metadata block
        return codebase_tokens + prompt_tokens + preamble_tokens + 200

    def will_fit(
        self,
        panel: PanelDef,
        model: ModelConfig,
        include_optional: bool = True,
    ) -> bool:
        """Check if a panel's prompt fits within a model's context window."""
        estimated = self.estimate_prompt_tokens(panel, include_optional)
        # Reserve space for output (max_output_tokens)
        available = model.context_window - model.max_output_tokens
        return estimated <= available

    def assemble(
        self,
        panel: PanelDef,
        model: ModelConfig,
        iteration: int,
    ) -> AssembledPrompt:
        """Assemble the final prompt for a specific panel + model + iteration.

        Tries to include optional sections. If the prompt doesn't fit,
        falls back to required-only.
        """
        temperature = model.temperature_for_iteration(iteration)
        panel_xml = self._read_panel_prompt(panel)

        # Try with optional sections first
        include_optional = True
        if not self.will_fit(panel, model, include_optional=True):
            include_optional = False
            if not self.will_fit(panel, model, include_optional=False):
                raise ValueError(
                    f"Panel {panel.panel_id} does not fit in {model.display_name}'s "
                    f"context window even with required sections only."
                )

        sections = self._gather_sections(panel, include_optional)
        codebase_block = _build_codebase_block(sections)
        metadata_block = _build_iteration_metadata(model, panel, iteration, temperature)

        user_prompt = (
            f"{panel_xml}\n\n{metadata_block}\n\n<codebase>\n{codebase_block}\n</codebase>"
        )

        estimated_tokens = self.bundler.count_tokens(user_prompt + _SYSTEM_PREAMBLE)

        return AssembledPrompt(
            system=_SYSTEM_PREAMBLE,
            user=user_prompt,
            panel=panel,
            model=model,
            iteration=iteration,
            temperature=temperature,
            estimated_input_tokens=estimated_tokens,
            included_sections=[s.section_id for s in sections],
            optional_included=include_optional,
        )


class AssembledPrompt:
    """A fully assembled prompt ready to send to an LLM."""

    def __init__(
        self,
        system: str,
        user: str,
        panel: PanelDef,
        model: ModelConfig,
        iteration: int,
        temperature: float,
        estimated_input_tokens: int,
        included_sections: list[str],
        optional_included: bool,
    ) -> None:
        self.system = system
        self.user = user
        self.panel = panel
        self.model = model
        self.iteration = iteration
        self.temperature = temperature
        self.estimated_input_tokens = estimated_input_tokens
        self.included_sections = included_sections
        self.optional_included = optional_included

    @property
    def run_id(self) -> str:
        """Unique identifier for this evaluation run."""
        model_short = self.model.api_model_id.replace("/", "_")
        return f"{self.panel.panel_id}_{model_short}_iter{self.iteration}"

    @property
    def estimated_cost(self) -> float:
        """Estimated cost in USD (input only — output cost added after response)."""
        return (self.estimated_input_tokens / 1_000_000) * self.model.input_cost_per_mtok

    def __repr__(self) -> str:
        return (
            f"AssembledPrompt(panel={self.panel.panel_id}, "
            f"model={self.model.display_name}, "
            f"iter={self.iteration}, "
            f"temp={self.temperature}, "
            f"tokens≈{self.estimated_input_tokens:,}, "
            f"sections={self.included_sections})"
        )
