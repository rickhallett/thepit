#!/usr/bin/env bash
# verify-attestation.sh — Independent on-chain attestation verification for The Pit
#
# This script verifies that an agent's on-chain attestation on Base L2 (via EAS)
# exists and can be decoded. It produces a plain-text verification report suitable
# for pasting into GitHub issues, blog posts, or terminal screenshots.
#
# Requirements:
#   - Go toolchain (to build pitnet if not already built)
#   - Internet access (queries Base L2 mainnet RPC)
#
# Usage:
#   ./scripts/verify-attestation.sh <attestation-uid>
#
# Example:
#   ./scripts/verify-attestation.sh 0x13da22148f63504eac18935143f20349a619b7ebeaf416f0fa5362db923f0724
#
# Exit codes:
#   0 — Attestation verified successfully
#   1 — Verification failed (not found, decode error, chain error)
#   2 — Usage error (missing UID, build failure)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PITNET_DIR="${REPO_ROOT}/pitnet"
PITNET_BIN="${PITNET_DIR}/pitnet"

# --- Argument check ---
if [ $# -lt 1 ]; then
  printf 'Usage: %s <attestation-uid> [--rpc <url>]\n\n' "$0" >&2
  printf 'Example:\n' >&2
  printf '  %s 0x13da22148f63504eac18935143f20349a619b7ebeaf416f0fa5362db923f0724\n\n' "$0" >&2
  printf 'Known-good test UIDs:\n' >&2
  printf '  0x13da22148f63504eac18935143f20349a619b7ebeaf416f0fa5362db923f0724  (StormAgent-3581)\n' >&2
  exit 2
fi

ATTESTATION_UID="$1"
shift

# --- Build pitnet if needed ---
if [ ! -x "${PITNET_BIN}" ]; then
  printf 'Building pitnet...\n' >&2
  if ! command -v go &>/dev/null; then
    printf 'error: Go toolchain not found. Install Go from https://go.dev/dl/\n' >&2
    exit 2
  fi
  (cd "${PITNET_DIR}" && go build -o pitnet .) || {
    printf 'error: Failed to build pitnet\n' >&2
    exit 2
  }
  printf 'Built pitnet successfully.\n\n' >&2
fi

# --- Run verification ---
exec "${PITNET_BIN}" proof "${ATTESTATION_UID}" "$@"
