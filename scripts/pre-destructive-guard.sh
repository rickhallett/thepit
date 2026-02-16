#!/usr/bin/env bash
# pre-destructive-guard.sh — Safety net before destructive database operations.
#
# Creates a backup before allowing destructive operations to proceed.
# Intended to wrap scripts like reset-prod-data.ts and pitctl purge-errors.
#
# Usage:
#   bash scripts/pre-destructive-guard.sh --confirm-destructive  # proceed after backup
#   bash scripts/pre-destructive-guard.sh                        # dry run (backup only)
#
# What it does:
#   1. Creates a Neon branch snapshot (instant, point-in-time)
#   2. Exports current data via pitctl (if available)
#   3. Logs the operation to stdout with timestamps
#   4. Only proceeds if --confirm-destructive is passed

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
RESET='\033[0m'

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_BRANCH="backup-${TIMESTAMP}"
CONFIRM=false
BACKUP_COUNT=0

for arg in "$@"; do
  case "$arg" in
    --confirm-destructive) CONFIRM=true ;;
  esac
done

echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  Pre-Destructive Operation Guard${RESET}"
echo -e "${BOLD}  ${TIMESTAMP}${RESET}"
echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
echo ""

# ── Step 1: Neon branch snapshot ──────────────────────────────────

echo -e "${BOLD}[1/3] Database Snapshot${RESET}"

if command -v neonctl > /dev/null 2>&1; then
  echo -e "  Creating Neon branch: ${BACKUP_BRANCH}"
  if neonctl branches create --name "$BACKUP_BRANCH" 2>&1; then
    echo -e "  ${GREEN}✓${RESET}  Neon branch '${BACKUP_BRANCH}' created"
    BACKUP_COUNT=$((BACKUP_COUNT + 1))
  else
    echo -e "  ${RED}✗${RESET}  Neon branch creation failed"
    echo -e "  ${RED}    Aborting — cannot proceed without backup${RESET}"
    exit 1
  fi
else
  echo -e "  ${YELLOW}!${RESET}  neonctl not found — skipping Neon branch snapshot"
  echo -e "  ${YELLOW}    Install: npm i -g neonctl${RESET}"
fi

# ── Step 2: Data export ───────────────────────────────────────────

echo ""
echo -e "${BOLD}[2/3] Data Export${RESET}"

BACKUP_DIR="backups/${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

if command -v pitctl > /dev/null 2>&1 || [ -f pitctl/pitctl ]; then
  PITCTL="${PITCTL:-pitctl}"
  command -v pitctl > /dev/null 2>&1 || PITCTL="./pitctl/pitctl"

  echo -e "  Exporting bouts..."
  if "$PITCTL" export bouts 2>/dev/null; then
    # pitctl writes to export/YYYY-MM-DD_bouts.jsonl
    LATEST_BOUTS=$(ls -t export/*_bouts.jsonl 2>/dev/null | head -1)
    if [[ -n "$LATEST_BOUTS" ]]; then
      cp "$LATEST_BOUTS" "${BACKUP_DIR}/bouts.jsonl"
      BOUT_COUNT=$(wc -l < "${BACKUP_DIR}/bouts.jsonl" | tr -d ' ')
      echo -e "  ${GREEN}✓${RESET}  ${BOUT_COUNT} bouts backed up"
      BACKUP_COUNT=$((BACKUP_COUNT + 1))
    fi
  else
    echo -e "  ${YELLOW}!${RESET}  Bout export failed"
  fi

  echo -e "  Exporting agents..."
  if "$PITCTL" export agents 2>/dev/null; then
    # pitctl writes to export/YYYY-MM-DD_agents.json
    LATEST_AGENTS=$(ls -t export/*_agents.json 2>/dev/null | head -1)
    if [[ -n "$LATEST_AGENTS" ]]; then
      cp "$LATEST_AGENTS" "${BACKUP_DIR}/agents.json"
      AGENT_COUNT=$(wc -l < "${BACKUP_DIR}/agents.json" | tr -d ' ')
      echo -e "  ${GREEN}✓${RESET}  ${AGENT_COUNT} agents backed up"
      BACKUP_COUNT=$((BACKUP_COUNT + 1))
    fi
  else
    echo -e "  ${YELLOW}!${RESET}  Agent export failed"
  fi
else
  echo -e "  ${YELLOW}!${RESET}  pitctl not found — skipping data export"
  echo -e "  ${YELLOW}    Build: make -C pitctl build${RESET}"
fi

# ── Step 3: Confirmation gate ─────────────────────────────────────

echo ""
echo -e "${BOLD}[3/3] Confirmation${RESET}"

echo -e "  Backup branch: ${GREEN}${BACKUP_BRANCH}${RESET}"
echo -e "  Backup dir:    ${GREEN}${BACKUP_DIR}/${RESET}"
echo ""

if [[ "$CONFIRM" == true ]]; then
  if [[ "$BACKUP_COUNT" -eq 0 ]]; then
    echo -e "  ${RED}✗  No backups succeeded. Cannot proceed with destructive operation.${RESET}"
    exit 1
  fi
  echo -e "  ${GREEN}✓${RESET}  Guard passed (${BACKUP_COUNT} backup(s)). Proceeding."
  exit 0
else
  echo -e "  ${BOLD}Dry run complete.${RESET} Backup created but no destructive action taken."
  echo -e "  To proceed, re-run with ${BOLD}--confirm-destructive${RESET}"
  echo ""
  exit 1
fi
