[← Root](../README.md)

# pitctl

Site administration CLI for [THE PIT](https://thepit.cloud). Reads the project `.env` file and queries Neon Postgres directly — no ORM, no server dependency.

## Install

```bash
cd pitctl
make install   # builds and installs to ~/go/bin/pitctl
```

Requires Go 1.23+.

## Configuration

`pitctl` auto-detects the `.env` file by walking up from the pitctl directory to the tspit project root. Override with `--env`:

```bash
pitctl --env /path/to/.env status
```

## Usage

```
pitctl [flags] <command> [subcommand] [args...]
```

### Global flags

| Flag          | Description                                    |
|---------------|------------------------------------------------|
| `--env <path>`| Path to `.env` file (default: auto-detect)     |
| `--yes`       | Skip confirmation prompts for write operations |

### Commands

#### `status` — Dashboard overview

```bash
pitctl status
```

Shows user/bout/agent counts, feature flags, free bout pool, and database size.

#### `env` — Validate environment

```bash
pitctl env                    # validate all 18 env vars are set
pitctl env --check-connections  # also test DB and Stripe connectivity
```

#### `db` — Database introspection

```bash
pitctl db          # table stats (row counts + sizes)
pitctl db ping     # connection check
pitctl db stats    # same as bare `pitctl db`
```

#### `users` — User management

```bash
pitctl users                              # list all users
pitctl users --tier pro --limit 20        # filter by tier
pitctl users --search "kai" --sort recent # search + sort
pitctl users inspect <userId>             # full user detail
pitctl --yes users set-tier <userId> pro  # change subscription tier
```

Tiers: `free`, `pro`, `team`.

#### `credits` — Credit economy

```bash
pitctl credits                            # economy summary
pitctl credits summary                    # same as above
pitctl credits balance <userId>           # user's current balance
pitctl credits ledger <userId>            # transaction history
pitctl credits ledger <userId> --limit 10 # last 10 transactions
pitctl --yes credits grant <userId> 500   # grant 500 credits
```

Credit amounts are in user-facing units (micro-credits / 100, 2 decimal places).

#### `bouts` — Bout management

```bash
pitctl bouts                              # list recent bouts
pitctl bouts --status completed --limit 5 # filter by status
pitctl bouts --owner <userId>             # filter by owner
pitctl bouts inspect <boutId>             # full bout detail
pitctl bouts stats                        # aggregate statistics
pitctl --yes bouts purge-errors           # delete error bouts
```

#### `agents` — Agent management

```bash
pitctl agents                             # list active agents
pitctl agents --archived                  # include archived
pitctl agents --flagged                   # flagged agents only
pitctl agents inspect <agentId>           # full agent detail
pitctl --yes agents archive <agentId>     # soft-delete
pitctl --yes agents restore <agentId>     # restore archived agent
```

#### `smoke` — HTTP health checks

```bash
pitctl smoke                              # check thepit.cloud (9 routes)
pitctl smoke --url http://localhost:3000   # check local dev server
```

Checks `/`, `/arena`, `/leaderboard`, `/agents`, `/research`, `/roadmap`, `/contact`, `/sign-in`, `/sign-up`. Reports status codes, latency, and TLS certificate expiry.

#### `export` — Research data export

```bash
pitctl export bouts                       # export all bouts as JSONL
pitctl export bouts --since 2025-01-01    # export since date
pitctl export agents                      # export all agents as JSON
```

Files are written to `pitctl/export/` (gitignored).

#### `version`

```bash
pitctl version
```

## Safety

Write operations (`set-tier`, `grant`, `archive`, `restore`, `purge-errors`) require the `--yes` flag. Without it, the command exits with an error reminding you to confirm. There are no interactive prompts.

## Development

```bash
make gate      # build + test + vet (the verification gate)
make build     # compile binary
make test      # run tests with verbose output
make coverage  # generate coverage report
make clean     # remove binary + coverage artifacts
```

31 tests across 5 packages. `make gate` must exit 0 before committing.

---

[← Root](../README.md) · [App](../app/README.md) · [DB](../db/README.md) · [Scripts](../scripts/README.md)
