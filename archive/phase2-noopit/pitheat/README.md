# pitheat

`pitheat` renders a terminal-friendly heatmap of a repository tree.

It aggregates file metrics up the directory hierarchy and prints a sorted tree
with percentages and heat bars so the heaviest parts of a repo stand out
immediately.

## Metrics

- `words`
- `files`
- `bytes`
- `lines`
- `git-churn`

## Usage

```bash
cargo run -- . --metric words
cargo run -- . --metric files --max-depth 3 --top 5
cargo run -- . --metric lines --ext rs,ts,tsx,md --color never
cargo run -- . --metric git-churn --git-churn-days 30
cargo run -- . --depth-ratios --ratio-base docs/internal --ratio-ext md
cargo run -- . --profile pitkeel-context
cargo run -- . --profile pitkeel-context --json
cargo run -- . --metric words --snapshot .gauntlet/pitheat.json
```

## Notes

- Respects `.gitignore` and standard hidden/build filters by default.
- Use `--all` to include hidden and ignored paths.
- Sorts children by the selected metric.
- `--min-percent` prunes branches below a share of the root total.
- `--depth-ratios` reports `D1/D2/D3+` file ratios relative to `--ratio-base`.
- `--profile pitkeel-context` enables `pitkeel`-style context ratio reporting for `docs/internal/**/*.md`.
- `--json` emits the current view as machine-readable JSON.
- `--snapshot <file>` writes the same JSON payload to disk for later comparison.
- `--metric git-churn` sums additions plus deletions from `git log --numstat` over `--git-churn-days`.
