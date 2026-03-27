[< Root](../README.md)

# docs/

Project documentation organized by purpose. Internal operational docs live in `docs/internal/`. Code-level documentation lives in source files (JSDoc for behaviour, header comments for purpose).

## Architecture & Building

| Document | Description |
|----------|-------------|
| [architecture.md](architecture.md) | High-level system architecture overview |
| [building.md](building.md) | Build instructions and local development setup |
| [roadmap.md](roadmap.md) | Product roadmap |
| [security.md](security.md) | Security model and practices |

## Design & Research

| Document | Description |
|----------|-------------|
| [agent-dna-attestations.md](agent-dna-attestations.md) | Design spec for agent identity hashing and EAS attestations |
| [research-citations.md](research-citations.md) | Literature review and academic citations |
| [lexical-harness-not-prompt-harness.md](lexical-harness-not-prompt-harness.md) | Argument for lexical vs prompt-based agent harnesses |
| [orchestration-layer-starting-template.md](orchestration-layer-starting-template.md) | Orchestration layer template (historical, from pilot study) |

## Specs

| Document | Description |
|----------|-------------|
| [specs/reduce-deps.md](specs/reduce-deps.md) | Dependency reduction specification |
| [specs/llm-qa-automation.md](specs/llm-qa-automation.md) | LLM-driven QA automation framework specification |
| [specs/level4-thin-contract.md](specs/level4-thin-contract.md) | Level-4 thin data contract specification |

## Examples

| Document | Description |
|----------|-------------|
| [examples/echo-signal-protocol-bearing-check.md](examples/echo-signal-protocol-bearing-check.md) | Historical example of Signal protocol bearing check (Signal killed SD-321) |

## What Goes Where

- **`AGENTS.md`** (root) - primary operational reference, auto-loaded by all agents
- **`docs/`** - external-facing documentation: architecture, specs, research
- **`docs/internal/`** - operational internals: lexicon, layer model, slopodar, session decisions, event log
- **`docs/decisions/`** - session-scoped decision records (SD-*)

---

[< Root](../README.md)
