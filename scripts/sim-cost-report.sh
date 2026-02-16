#!/usr/bin/env bash
# sim-cost-report.sh — Compose pitstorm simulation output with pitbench cost estimation.
#
# Takes a pitstorm JSON output file and produces a cost breakdown report
# by extracting simulation metrics and feeding them to pitbench.
#
# Usage:
#   pitstorm run --output sim.json && bash scripts/sim-cost-report.sh sim.json
#   bash scripts/sim-cost-report.sh --dry-run sim.json  # estimate without running sim
#
# Prerequisites:
#   - pitbench built (make -C pitbench build)
#   - jq installed
#   - A pitstorm output JSON file

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
RESET='\033[0m'

INPUT_FILE=""

# Parse args
for arg in "$@"; do
  case "$arg" in
    --dry-run) ;; # reserved for future use
    -*) echo "Unknown flag: $arg"; exit 1 ;;
    *) INPUT_FILE="$arg" ;;
  esac
done

if [[ -z "$INPUT_FILE" ]]; then
  echo "Usage: bash scripts/sim-cost-report.sh <pitstorm-output.json>"
  exit 1
fi

if [[ ! -f "$INPUT_FILE" ]]; then
  echo -e "${RED}File not found: ${INPUT_FILE}${RESET}"
  exit 1
fi

if ! command -v jq > /dev/null 2>&1; then
  echo -e "${RED}jq is required. Install: brew install jq / apt install jq${RESET}"
  exit 1
fi

# Resolve pitbench path
PITBENCH="${PITBENCH:-}"
if [[ -z "$PITBENCH" ]]; then
  if command -v pitbench > /dev/null 2>&1; then PITBENCH="pitbench"
  elif [[ -f pitbench/pitbench ]]; then PITBENCH="./pitbench/pitbench"
  else
    echo -e "${RED}pitbench not found. Run: make -C pitbench build${RESET}"
    exit 1
  fi
fi

echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  Simulation Cost Report${RESET}"
echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
echo ""

# ── Extract simulation metrics ────────────────────────────────────

echo -e "${BOLD}[1/2] Simulation Metrics${RESET}"

TOTAL_BOUTS=$(jq '.boutsDone // 0' "$INPUT_FILE" 2>/dev/null || echo "0")
BOUT_STARTS=$(jq '.boutStarts // 0' "$INPUT_FILE" 2>/dev/null || echo "0")
DURATION=$(jq -r '.elapsed // "unknown"' "$INPUT_FILE" 2>/dev/null || echo "unknown")
ERROR_COUNT=$(jq '.errors // 0' "$INPUT_FILE" 2>/dev/null || echo "0")
SUCCESS_COUNT=$(jq '.successes // 0' "$INPUT_FILE" 2>/dev/null || echo "0")

echo -e "  Bout starts:    ${BOUT_STARTS}"
echo -e "  Bouts done:     ${TOTAL_BOUTS}"
echo -e "  Successful:     ${SUCCESS_COUNT}"
echo -e "  Errors:         ${ERROR_COUNT}"
echo -e "  Elapsed:        ${DURATION}"

# ── Cost estimation ───────────────────────────────────────────────

echo ""
echo -e "${BOLD}[2/2] Cost Estimation${RESET}"

if [[ "$TOTAL_BOUTS" -gt 0 ]]; then
  echo -e "  Running pitbench estimate (per-bout cost at default settings)..."
  echo ""
  "$PITBENCH" estimate 2>&1 | sed 's/^/  /'
  echo ""
  echo -e "  Multiply per-bout cost by ${TOTAL_BOUTS} bouts for total simulation cost."
else
  echo -e "  ${YELLOW}!${RESET}  No bouts in simulation — cannot estimate cost"
fi

# ── Summary ───────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
echo -e "  Input:  ${INPUT_FILE}"
echo -e "  Bouts:  ${TOTAL_BOUTS} (${SUCCESS_COUNT} success, ${ERROR_COUNT} errors)"
echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
echo ""
