"""Model configurations for the three evaluation LLMs.

Each model has: API identifier, context window, pricing, temperature center,
and the env var name for its API key.

Temperature strategy: we vary around each model's optimal evaluation temperature,
NOT at absolute 0. Center ~0.5-0.7, vary ±0.15 to estimate within-model noise.

Protocol specifies temperatures: [0.0, 0.2, 0.4, 0.2, 0.0] for 5 iterations.
We re-map these to offsets from the center:
  center - 0.2, center - 0.1, center, center - 0.1, center - 0.2

Long-context pricing (Anthropic only):
  Claude Sonnet 4.6 supports 1M context via beta header `context-1m-2025-08-07`.
  When input exceeds 200K tokens, ALL tokens are billed at premium rates:
    Input:  $6/MTok  (2x standard $3/MTok)
    Output: $22.50/MTok (1.5x standard $15/MTok)
  See: docs/eval-briefs/002-long-context-cost-decision.md
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class ModelProvider(Enum):
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GOOGLE = "google"


@dataclass(frozen=True)
class ModelConfig:
    """Configuration for a single evaluation model."""

    provider: ModelProvider
    api_model_id: str
    display_name: str
    context_window: int
    input_cost_per_mtok: float  # USD per 1M input tokens (standard)
    output_cost_per_mtok: float  # USD per 1M output tokens (standard)
    env_var: str  # env var name for API key
    temperature_center: float = 0.6
    temperature_offsets: tuple[float, ...] = (-0.2, -0.1, 0.0, -0.1, -0.2)
    max_output_tokens: int = 16384
    # Long-context pricing (when input > long_context_threshold tokens)
    long_context_threshold: int = 0  # 0 = no long-context pricing
    long_context_input_cost_per_mtok: float = 0.0
    long_context_output_cost_per_mtok: float = 0.0

    @property
    def temperatures(self) -> list[float]:
        """Compute actual temperatures for each iteration."""
        return [round(self.temperature_center + offset, 2) for offset in self.temperature_offsets]

    def temperature_for_iteration(self, iteration: int) -> float:
        """Get temperature for a specific 1-based iteration."""
        temps = self.temperatures
        idx = (iteration - 1) % len(temps)
        return temps[idx]


# --- Model registry ---

CLAUDE = ModelConfig(
    provider=ModelProvider.ANTHROPIC,
    api_model_id="claude-sonnet-4-6",
    display_name="Claude Sonnet 4.6",
    context_window=1_000_000,  # 1M via beta header context-1m-2025-08-07
    input_cost_per_mtok=3.0,
    output_cost_per_mtok=15.0,
    env_var="ANTHROPIC_API_KEY",
    temperature_center=0.6,
    long_context_threshold=200_000,
    long_context_input_cost_per_mtok=6.0,  # 2x standard
    long_context_output_cost_per_mtok=22.5,  # 1.5x standard
)

GPT = ModelConfig(
    provider=ModelProvider.OPENAI,
    api_model_id="gpt-5.2",
    display_name="GPT-5.2",
    context_window=400_000,
    input_cost_per_mtok=1.75,
    output_cost_per_mtok=14.0,
    env_var="OPENAI_API_KEY",
    temperature_center=0.5,
)

GEMINI = ModelConfig(
    provider=ModelProvider.GOOGLE,
    api_model_id="gemini-2.5-pro",
    display_name="Gemini 2.5 Pro",
    context_window=1_000_000,
    input_cost_per_mtok=2.0,
    output_cost_per_mtok=12.0,
    env_var="GEMINI_API_KEY",
    temperature_center=0.5,
)

ALL_MODELS: list[ModelConfig] = [CLAUDE, GPT, GEMINI]

# --- Panel definitions ---


@dataclass(frozen=True)
class PanelDef:
    """Definition of an evaluation panel."""

    panel_id: str
    name: str
    prompt_file: str  # filename in docs/eval-prompts/
    metric_count: int
    required_sections: tuple[str, ...]
    optional_sections: tuple[str, ...]


PANELS: list[PanelDef] = [
    PanelDef(
        "101",
        "Architecture & Systems Design",
        "101-architecture.xml",
        8,
        ("A", "B", "E", "F", "G"),
        ("C", "D"),
    ),
    PanelDef(
        "102", "Code Quality & Craft", "102-code-quality.xml", 8, ("A", "B", "C"), ("D", "E", "F")
    ),
    PanelDef(
        "103", "Security Engineering", "103-security.xml", 10, ("A", "B", "E", "G"), ("C", "D", "F")
    ),
    PanelDef("104", "Type System & Safety", "104-type-system.xml", 6, ("A", "B", "E"), ("C", "D")),
    PanelDef("105", "Database Engineering", "105-database.xml", 8, ("A", "G"), ("B", "D")),
    PanelDef("106", "API Design", "106-api-design.xml", 7, ("B", "A"), ("D", "E")),
    PanelDef("107", "AI/LLM Integration", "107-ai-integration.xml", 8, ("A",), ("D", "E")),
    PanelDef("108", "Frontend Engineering", "108-frontend.xml", 7, ("C", "A"), ("E", "D")),
    PanelDef(
        "109", "DevOps & Operational Readiness", "109-devops.xml", 7, ("E", "A"), ("B", "D", "F")
    ),
    PanelDef(
        "110",
        "Engineering Culture & Practice",
        "110-culture.xml",
        6,
        ("A", "B", "C", "D", "E", "F", "G"),
        (),
    ),
    PanelDef(
        "111",
        "Scalability & Production Readiness",
        "111-scalability.xml",
        7,
        ("A", "B", "E", "G"),
        ("C", "D", "F"),
    ),
    PanelDef("112", "Testing Philosophy", "112-testing.xml", 12, ("D", "A"), ("B", "E")),
]

AGGREGATION_PANEL = PanelDef("113", "Aggregation & Synthesis", "113-aggregation.xml", 0, (), ())

TOTAL_METRICS = sum(p.metric_count for p in PANELS)  # 94


def get_panel(panel_id: str) -> PanelDef:
    """Get a panel definition by ID."""
    for panel in PANELS:
        if panel.panel_id == panel_id:
            return panel
    if panel_id == "113":
        return AGGREGATION_PANEL
    raise ValueError(f"Unknown panel ID: {panel_id}")


def get_model(name: str) -> ModelConfig:
    """Get a model config by display name or API ID."""
    name_lower = name.lower()
    for model in ALL_MODELS:
        if name_lower in (model.display_name.lower(), model.api_model_id.lower()):
            return model
    raise ValueError(f"Unknown model: {name}. Available: {[m.display_name for m in ALL_MODELS]}")
