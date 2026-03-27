# Audit Trail

Every crew run persists the full action trace per agent alongside the
review verdict. When the container exits, nothing is lost.

```
data/alley/crew-live-2026-03-11-143022/
|
|-- run-metadata.yaml          run config, models used, triangulated verdict
|-- calc.py                    injected source (provenance)
|-- diff.patch                 the diff under review
|
|-- watchdog-prompt.md         the prompt watchdog received
|-- watchdog-review.yaml       structured verdict (pass/fail, findings)
|-- watchdog-trace.json        full action trace (gemini --output-format json)
|-- watchdog-stderr.log        CLI stderr
|
|-- weaver-prompt.md           the prompt weaver received
|-- weaver-review.yaml         structured verdict
|-- weaver-trace.json          full API response (xAI, raw JSON)
|
|-- sentinel-prompt.md         the prompt sentinel received
|-- sentinel-review.yaml       structured verdict
|-- sentinel-trace.jsonl       full event stream (codex --json, JSONL)
|-- sentinel-stderr.log        CLI stderr
```

## What each trace captures

**Gemini** (`--output-format json`): structured JSON with every tool call
the agent made - file reads, bash commands, file writes - with inputs and
outputs. The complete chain from prompt to verdict.

**Grok** (raw API response): single API call (no agentic CLI), so the trace
is the full `chat/completions` response including token counts, finish
reason, and the model's complete output. No tool calls to trace because
grok produces the review YAML directly in its response.

**Codex** (`--json`): JSONL event stream. One JSON object per line, one
event per tool call or result. Reconstructs the full sequence of actions
the agent took inside the container.

## Why the formats differ

Each provider's CLI exposes structured output differently. Gemini and
Codex are agentic CLIs (they call tools, read files, run commands inside
the container). Grok is a single API call via curl. The traces reflect
what each agent actually did, not a normalised abstraction over it.

A future step would be a normaliser that converts all three formats into
a common schema for cross-agent comparison. That has not been built.

## What is auditable

For each crew run you can reconstruct:

1. **What the agent was told** - the prompt file, the diff, the source
2. **What the agent did** - every tool call, file read, command execution
3. **What the agent concluded** - the structured YAML verdict
4. **What the orchestrator decided** - the triangulated verdict in metadata

The gap between 2 and 3 is where governance failures hide. An agent that
reads the right file but draws the wrong conclusion, or an agent that
skips a file entirely - both are visible in the trace but invisible in
the verdict alone.

## Provenance

Artifacts are saved to `data/alley/crew-live-{timestamp}/` on the host
filesystem before the Docker volumes are destroyed. The `run-metadata.yaml`
records which model ran which role, the injected defect description, and
the final triangulated verdict.
