[← Root](../README.md)

# pitlab

Research analysis toolkit for [THE PIT](https://thepit.cloud). Operates on exported research JSON data and provides dataset statistics, persona survival analysis, position bias detection, engagement curves, and a research codebook generator.

## Install

```bash
cd pitlab
make install   # builds and installs to ~/go/bin/pitlab
```

Requires Go 1.25+.

## Data source

All data commands require a research export JSON file, passed via `--data`:

```bash
# Download from the platform
curl -o research.json https://thepit.cloud/api/research/export

# Or use pitctl
pitctl export bouts --since 2025-01-01
```

## Commands

### `summary` — Dataset overview (lab)

```bash
pitlab --data research.json summary
```

Shows bout/agent/vote/reaction counts, unique presets/users/voters, turn count distribution (min/max/mean/median/stddev), reaction type breakdown, and preset popularity ranking.

### `survival` — Win rate analysis (lab)

```bash
pitlab --data research.json survival
pitlab --data research.json survival --min-bouts 5
```

Ranks agents by win rate with per-tier aggregation. `--min-bouts N` filters to agents with at least N bouts (default 1).

### `position` — First-mover advantage (lab)

```bash
pitlab --data research.json position
```

Analyses win rate by speaking order position to detect first-mover advantage.

### `engagement` — Reaction curves (lab)

```bash
pitlab --data research.json engagement
```

Shows reaction density per turn position with an ASCII histogram. Identifies which turns generate the most audience engagement.

### `codebook` — Variable documentation (free)

```bash
pitlab codebook
```

Generates a research codebook documenting all variables (bouts, agents, votes, reactions), derived metrics, and research methodology notes. Does not require data or a license.

### `version`

```bash
pitlab version
```

## Architecture

| Package | Description |
|---------|-------------|
| `internal/dataset` | Export parsing, typed structs (`Bout`, `Agent`, `Vote`, `Reaction`), in-memory indexing, `Stats()` aggregation |
| `internal/analysis` | `WinnerStats()`, `PositionBias()`, `EngagementByTurn()`, `PresetPopularity()`, `ReactionDistribution()`, `Describe()` (descriptive statistics) |

## Development

```bash
make gate      # vet + build + test
make build     # compile binary
make test      # run tests with verbose output
make coverage  # generate coverage report
make clean     # remove binary + coverage artifacts
```

---

[← Root](../README.md) · [pitctl](../pitctl/README.md) · [pitforge](../pitforge/README.md) · [pitbench](../pitbench/README.md) · [pitnet](../pitnet/README.md) · [shared](../shared/README.md)
