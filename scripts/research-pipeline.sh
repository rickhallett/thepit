#!/usr/bin/env bash
# research-pipeline.sh — Bridge pitctl export (JSONL) to pitlab analysis (JSON).
#
# Transforms pitctl's JSONL export into the JSON research export format
# expected by pitlab analysis commands.
#
# Usage:
#   bash scripts/research-pipeline.sh                                # Export last 7 days
#   bash scripts/research-pipeline.sh --since "30 days"              # Export last 30 days
#   bash scripts/research-pipeline.sh --since "2026-01-01"           # Export since date
#   bash scripts/research-pipeline.sh --since "7 days" --output out/ # Custom output dir
#
# --since is passed directly to SQL (WHERE created_at >= $1).
# Valid formats: PostgreSQL interval ('7 days', '30 days', '1 month') or date ('2026-01-01').
#
# Prerequisites:
#   - pitctl built (make -C pitctl build)
#   - pitlab built (make -C pitlab build) [optional, for analysis]
#   - DATABASE_URL set in environment
#   - jq installed (for JSON transformation)

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
RESET='\033[0m'

# --since is passed directly to SQL (e.g., "2026-01-01", "7 days", or omit for all)
# PostgreSQL interval syntax: '7 days', '30 days', '1 month'
SINCE="7 days"
OUTPUT_DIR="research-exports"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --since) SINCE="$2"; shift 2 ;;
    --output) OUTPUT_DIR="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

EXPORT_DIR="${OUTPUT_DIR}/${TIMESTAMP}"
mkdir -p "$EXPORT_DIR"

# Resolve pitctl and pitlab paths
PITCTL="${PITCTL:-}"
PITLAB="${PITLAB:-}"
if [[ -z "$PITCTL" ]]; then
  if command -v pitctl > /dev/null 2>&1; then PITCTL="pitctl"
  elif [[ -f pitctl/pitctl ]]; then PITCTL="./pitctl/pitctl"
  else echo -e "${RED}pitctl not found. Run: make -C pitctl build${RESET}"; exit 1
  fi
fi
if [[ -z "$PITLAB" ]]; then
  if command -v pitlab > /dev/null 2>&1; then PITLAB="pitlab"
  elif [[ -f pitlab/pitlab ]]; then PITLAB="./pitlab/pitlab"
  fi
fi

echo ""
echo -e "${BOLD}Research Export Pipeline${RESET}"
echo -e "  Period: ${SINCE}"
echo -e "  Output: ${EXPORT_DIR}/"
echo ""

# ── Step 1: Export raw JSONL ──────────────────────────────────────

echo -e "${BOLD}[1/3] Exporting data via pitctl${RESET}"

echo -e "  Exporting bouts..."
"$PITCTL" export bouts --since "$SINCE" 2>&1 || { echo -e "  ${RED}✗${RESET}  Bout export failed"; }
LATEST_BOUTS=$(ls -t export/*_bouts.jsonl 2>/dev/null | head -1)
if [[ -n "$LATEST_BOUTS" ]]; then
  cp "$LATEST_BOUTS" "${EXPORT_DIR}/bouts.jsonl"
  BOUT_COUNT=$(wc -l < "${EXPORT_DIR}/bouts.jsonl" | tr -d ' ')
  echo -e "  ${GREEN}✓${RESET}  ${BOUT_COUNT} bouts → bouts.jsonl"
else
  echo -e "  ${YELLOW}!${RESET}  No bout export file found"
  echo '[]' > "${EXPORT_DIR}/bouts.jsonl"
  BOUT_COUNT=0
fi

echo -e "  Exporting agents..."
"$PITCTL" export agents 2>&1 || { echo -e "  ${RED}✗${RESET}  Agent export failed"; }
LATEST_AGENTS=$(ls -t export/*_agents.json 2>/dev/null | head -1)
if [[ -n "$LATEST_AGENTS" ]]; then
  cp "$LATEST_AGENTS" "${EXPORT_DIR}/agents.json"
  AGENT_COUNT=$(wc -l < "${EXPORT_DIR}/agents.json" | tr -d ' ')
  echo -e "  ${GREEN}✓${RESET}  ${AGENT_COUNT} agents → agents.json"
else
  echo -e "  ${YELLOW}!${RESET}  No agent export file found"
  echo '[]' > "${EXPORT_DIR}/agents.json"
  AGENT_COUNT=0
fi

# ── Step 2: Transform to research export format ───────────────────

echo ""
echo -e "${BOLD}[2/3] Transforming to research export format${RESET}"

# Transform into a single JSON research export object.
# The research export format has: { bouts: [...], agents: [...], exportedAt, period }
# bouts.jsonl is JSONL (one JSON object per line), agents.json is already JSON array.
if command -v jq > /dev/null 2>&1; then
  jq -s '.' "${EXPORT_DIR}/bouts.jsonl" > "${EXPORT_DIR}/bouts-array.json" 2>/dev/null || echo '[]' > "${EXPORT_DIR}/bouts-array.json"

  jq -n \
    --slurpfile bouts "${EXPORT_DIR}/bouts-array.json" \
    --slurpfile agents "${EXPORT_DIR}/agents.json" \
    --arg exportedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg period "$SINCE" \
    '{
      bouts: ($bouts[0] // []),
      agents: ($agents[0] // []),
      reactions: [],
      votes: [],
      exportedAt: $exportedAt,
      period: $period
    }' > "${EXPORT_DIR}/research-export.json"

  SIZE=$(wc -c < "${EXPORT_DIR}/research-export.json" | tr -d ' ')
  echo -e "  ${GREEN}✓${RESET}  research-export.json (${SIZE} bytes)"

  # Clean up intermediate files
  rm -f "${EXPORT_DIR}/bouts-array.json"
else
  echo -e "  ${YELLOW}!${RESET}  jq not found — JSONL files available but JSON transform skipped"
  echo -e "  ${YELLOW}    Install: brew install jq / apt install jq${RESET}"
fi

# ── Step 3: Run analysis (if pitlab available) ────────────────────

echo ""
echo -e "${BOLD}[3/3] Analysis${RESET}"

if [[ -n "$PITLAB" && -f "${EXPORT_DIR}/research-export.json" ]]; then
  echo -e "  Running pitlab summary..."
  if "$PITLAB" summary --data "${EXPORT_DIR}/research-export.json" > "${EXPORT_DIR}/summary.txt" 2>&1; then
    echo -e "  ${GREEN}✓${RESET}  Summary → summary.txt"
  else
    echo -e "  ${YELLOW}!${RESET}  pitlab summary failed (output in summary.txt)"
  fi
else
  if [[ -z "$PITLAB" ]]; then
    echo -e "  ${YELLOW}!${RESET}  pitlab not found — skipping analysis"
    echo -e "  ${YELLOW}    Build: make -C pitlab build${RESET}"
  else
    echo -e "  ${YELLOW}!${RESET}  No research-export.json — skipping analysis"
  fi
fi

# ── Summary ───────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
echo -e "  Export complete: ${GREEN}${EXPORT_DIR}/${RESET}"
echo -e "  Files:"
ls -lh "${EXPORT_DIR}/" | grep -v '^total' | awk '{print "    " $NF " (" $5 ")"}'
echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
echo ""
