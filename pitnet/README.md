[← Root](../README.md)

# pitnet

On-chain provenance CLI for [THE PIT](https://thepit.cloud). Verifies and audits agent identity attestations on the Ethereum Attestation Service (EAS) deployed on Base L2. Uses raw JSON-RPC over HTTP — no heavy Ethereum SDK dependency.

## Install

```bash
cd pitnet
make install   # builds and installs to ~/go/bin/pitnet
```

Requires Go 1.25+.

## Chain configuration

| Constant | Value |
|----------|-------|
| Network | Base L2 (mainnet) |
| Chain ID | 8453 |
| EAS contract | `0x4200000000000000000000000000000000000021` |
| Schema registry | `0x4200000000000000000000000000000000000020` |
| Default RPC | `https://mainnet.base.org` |

Override the RPC endpoint with `--rpc <url>` or the `EAS_RPC_URL` environment variable.

## Commands

### `status` — Connectivity check (free)

```bash
pitnet status
pitnet status --rpc https://base-rpc.example.com
```

Checks chain ID, latest block number, and schema UID configuration. Exits non-zero if any RPC call fails.

### `verify` — Attestation lookup (lab)

```bash
pitnet verify <attestation-uid>
pitnet verify <attestation-uid> --rpc <url>
```

Fetches an attestation by UID via `eth_call` to the EAS `getAttestation()` function. Decodes and displays all agent identity fields: agentId, name, presetId, tier, promptHash, manifestHash, parentId, ownerId, createdAt.

### `submit` — Encode attestation payload (lab)

```bash
pitnet submit --agent-id <id> --name "Agent Name" --prompt-hash <hash> --manifest-hash <hash>
pitnet submit --json manifest.json
```

ABI-encodes an attestation payload for an agent. Prints hex-encoded calldata suitable for submitting to the EAS contract.

| Flag | Required | Description |
|------|----------|-------------|
| `--agent-id` | Yes | Agent UUID |
| `--name` | Yes | Agent display name |
| `--prompt-hash` | Yes | SHA-256 prompt hash (bytes32) |
| `--manifest-hash` | Yes | SHA-256 manifest hash (bytes32) |
| `--preset-id` | No | Preset identifier |
| `--tier` | No | Agent tier |
| `--parent-id` | No | Parent agent UUID |
| `--owner-id` | No | Owner user ID |
| `--created-at` | No | Unix timestamp |
| `--json <file>` | No | Load all fields from a manifest JSON file |

### `audit` — Database vs on-chain audit (lab)

```bash
pitnet audit
pitnet audit --rpc <url> --db <connection-string>
```

Queries all agents with attestation UIDs in the database, verifies each on-chain, and compares promptHash + manifestHash. Reports pass/fail per agent with a summary. Uses `DATABASE_URL` from `.env` by default.

### `version`

```bash
pitnet version
```

## Architecture

| Package | Description |
|---------|-------------|
| `internal/chain` | Minimal Ethereum JSON-RPC client. `ChainID()`, `BlockNumber()`, `GetAttestation()`, `GetTransactionReceipt()`. ABI decoding of EAS attestation struct |
| `internal/abi` | Purpose-built Solidity ABI encoder/decoder for the pit EAS schema (9 fields: 6 strings, 2 bytes32, 1 uint64) |

## Development

```bash
make gate      # vet + build + test
make build     # compile binary
make test      # run tests with verbose output
make coverage  # generate coverage report
make clean     # remove binary + coverage artifacts
```

---

[← Root](../README.md) · [pitctl](../pitctl/README.md) · [pitforge](../pitforge/README.md) · [pitbench](../pitbench/README.md) · [pitlab](../pitlab/README.md) · [shared](../shared/README.md)
