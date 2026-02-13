[← Root](../README.md)

# pitbench

Cost and performance benchmarking tool for [THE PIT](https://thepit.cloud). Estimates bout costs, calculates exact costs from token counts, verifies platform margin, and displays model pricing. Faithful Go port of `lib/credits.ts`.

## Install

```bash
cd pitbench
make install   # builds and installs to ~/go/bin/pitbench
```

Requires Go 1.25+.

## Commands

### `models` — Pricing table (free)

```bash
pitbench models
```

Shows per-1M-token rates (input/output) in GBP for all supported Claude models, cost ratios, and unit conversion constants.

### `estimate` — Bout cost estimate (lab)

```bash
pitbench estimate
pitbench estimate --model claude-sonnet-4-5-20250929 --turns 8 --length long
```

Estimates cost for a hypothetical bout. Shows raw cost, platform margin (10%), charged total, micro-credits, and user-facing credits.

| Flag | Default | Description |
|------|---------|-------------|
| `--model` / `-m` | `claude-3-5-haiku-latest` | Model ID |
| `--turns` / `-t` | 12 | Number of turns |
| `--length` / `-l` | `standard` | Response length: `short`, `standard`, `long` |

### `cost` — Exact token cost (lab)

```bash
pitbench cost --model claude-sonnet-4-5-20250929 --input 5000 --output 2000
```

Calculates exact cost for specific input/output token counts.

| Flag | Description |
|------|-------------|
| `--model` / `-m` | Model ID (required) |
| `--input` / `-i` | Input token count (required) |
| `--output` / `-o` | Output token count (required) |

### `margin` — Platform margin verification (lab)

```bash
pitbench margin
```

Verifies the 10% platform margin across all 4 models at standard bout parameters (12 turns, standard length). Includes BYOK comparison showing the margin differential.

### `version`

```bash
pitbench version
```

## Pricing model

The credit economy uses these constants:

| Constant | Value |
|----------|-------|
| Platform margin | 10% |
| Micro-credits per credit | 100 |
| GBP per credit | 0.01 |
| Characters per token (approx) | 4 |

## Architecture

| Package | Description |
|---------|-------------|
| `internal/pricing` | `ModelPrice` table (4 Claude models), `CalculateCost()`, `EstimateBout()`, `CalculateBYOK()` |

## Development

```bash
make gate      # vet + build + test
make build     # compile binary
make test      # run tests with verbose output
make coverage  # generate coverage report
make clean     # remove binary + coverage artifacts
```

---

[← Root](../README.md) · [pitctl](../pitctl/README.md) · [pitforge](../pitforge/README.md) · [pitlab](../pitlab/README.md) · [pitnet](../pitnet/README.md) · [shared](../shared/README.md)
