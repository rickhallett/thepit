[← Root](../README.md)

# pitforge

Agent development toolkit for [THE PIT](https://thepit.cloud). Scaffold, validate, lint, hash, diff, and evolve AI debate agent definitions. Run local sparring bouts via the Anthropic streaming API.

## Install

```bash
cd pitforge
make install   # builds and installs to ~/go/bin/pitforge
```

Requires Go 1.25+.

## Commands

Commands are split into free and premium (lab-tier license required).

### Free commands

#### `init` — Scaffold a new agent

```bash
pitforge init "Iron Socrates"
pitforge init "Comedy Bot" --template comedy
```

Templates: `minimal`, `full`, `debate` (default), `comedy`. Writes a YAML file named after the slugified agent name.

#### `validate` — Check agent definition

```bash
pitforge validate agent.yaml
```

Validates against DB schema constraints: name length, valid tier, responseLength, responseFormat, system prompt bounds.

#### `lint` — Heuristic quality checks

```bash
pitforge lint agent.yaml
```

Checks prompt length, vague archetype, missing differentiation, no weakness, contradictory tone, duplicate quirks, and anti-patterns (prompt injection, role hijacking).

#### `hash` — Compute identity hashes

```bash
pitforge hash agent.yaml
```

Computes `promptHash` (SHA-256 of RFC 8785 canonicalized system prompt) and `manifestHash` (SHA-256 of full manifest). These hashes are used for on-chain attestation via EAS.

#### `diff` — Compare two agents

```bash
pitforge diff agent-a.yaml agent-b.yaml
```

Field-by-field semantic diff with prompt hash comparison. Uses `slices.Equal` for element-wise quirks comparison.

#### `catalog` — Browse presets

```bash
pitforge catalog              # list all presets
pitforge catalog ethics-arena # show full preset detail
```

Reads from the `presets/` directory.

### Premium commands (lab-tier license)

These commands require a valid lab-tier license at `~/.pit/license.jwt` or `$PITLAB_LICENSE`.

#### `spar` — Local streaming debate

```bash
pitforge spar agent-a.yaml agent-b.yaml
pitforge spar agent-a.yaml agent-b.yaml --topic "Is AI art real art?" --turns 8
pitforge spar agent-a.yaml agent-b.yaml --model claude-sonnet-4-5-20250929
```

Runs a live debate between two agent definitions via the Anthropic Messages API with streaming SSE output. Requires `ANTHROPIC_API_KEY` in `.env`.

| Flag | Default | Description |
|------|---------|-------------|
| `--topic` | "Is technology making humanity better or worse?" | Debate topic |
| `--turns` | 12 | Number of turns |
| `--model` | `claude-3-5-haiku-latest` | Anthropic model ID |

#### `evolve` — AI-powered variant generation

```bash
pitforge evolve agent.yaml
pitforge evolve agent.yaml --strategy sweep --count 5
pitforge evolve agent.yaml --strategy ablate
```

Generates agent prompt variants using the Anthropic API. Requires `ANTHROPIC_API_KEY`.

| Flag | Default | Description |
|------|---------|-------------|
| `--strategy` / `-s` | `mutate` | `mutate`: perturb 2-3 fields. `sweep`: vary tone dimension. `ablate`: remove one field at a time |
| `--count` / `-n` | 3 | Number of variants (ignored for ablate) |

#### `lineage` — Agent ancestry tree

```bash
pitforge lineage <agentId>
```

Visualizes parent/child lineage from the database using a recursive CTE. Requires `DATABASE_URL`.

## Configuration

Premium commands load `.env` automatically. Override with `--env <path>`.

| Variable | Required for |
|----------|-------------|
| `ANTHROPIC_API_KEY` | `spar`, `evolve` |
| `DATABASE_URL` | `lineage` |

## Architecture

| Package | Description |
|---------|-------------|
| `internal/agent` | `Definition` struct, YAML serialization, validation, `Slugify()` |
| `internal/prompt` | System prompt composition (Go port of `lib/agent-prompts.ts`) |
| `internal/dna` | Deterministic identity hashing (Go port of `lib/agent-dna.ts`) |
| `internal/canon` | RFC 8785 JSON Canonicalization, byte-identical to npm `canonicalize` |
| `internal/anthropic` | Streaming Anthropic Messages API client with SSE parsing |

## Development

```bash
make gate      # vet + build + test
make build     # compile binary
make test      # run tests with verbose output
make coverage  # generate coverage report
make clean     # remove binary + coverage artifacts
```

---

[← Root](../README.md) · [pitctl](../pitctl/README.md) · [pitbench](../pitbench/README.md) · [pitlab](../pitlab/README.md) · [pitnet](../pitnet/README.md) · [shared](../shared/README.md)
