#!/usr/bin/env bash
# bootstrap.sh — Get a new developer from git clone to running dev server.
#
# Usage:
#   pnpm run setup        # via npm script
#   bash scripts/bootstrap.sh  # direct
#
# Checks prerequisites, installs dependencies, builds Go CLIs (if Go is
# available), and validates the environment configuration.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
RESET='\033[0m'

PASS=0
WARN=0
FAIL=0

check() {
  local label="$1"
  local cmd="$2"
  if eval "$cmd" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${RESET}  $label"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${RESET}  $label"
    FAIL=$((FAIL + 1))
    return 1
  fi
}

warn_check() {
  local label="$1"
  local cmd="$2"
  if eval "$cmd" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${RESET}  $label"
    PASS=$((PASS + 1))
  else
    echo -e "  ${YELLOW}!${RESET}  $label (optional)"
    WARN=$((WARN + 1))
  fi
}

echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  The Pit — Developer Bootstrap${RESET}"
echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
echo ""

# ── 1. Prerequisites ──────────────────────────────────────────────

echo -e "${BOLD}[1/5] Prerequisites${RESET}"

check "node installed" "command -v node"
check "pnpm installed" "command -v pnpm"
warn_check "go installed (needed for Go CLIs)" "command -v go"

EXPECTED_NODE=$(cat .nvmrc 2>/dev/null || echo "unknown")
ACTUAL_NODE=$(node --version 2>/dev/null | sed 's/^v//' || echo "none")
if [[ "$ACTUAL_NODE" == "$EXPECTED_NODE" ]]; then
  echo -e "  ${GREEN}✓${RESET}  node version matches .nvmrc ($EXPECTED_NODE)"
  PASS=$((PASS + 1))
else
  echo -e "  ${YELLOW}!${RESET}  node version mismatch (.nvmrc wants $EXPECTED_NODE, got $ACTUAL_NODE)"
  WARN=$((WARN + 1))
fi

# ── 2. Environment ────────────────────────────────────────────────

echo ""
echo -e "${BOLD}[2/5] Environment${RESET}"

if [[ -f .env ]]; then
  echo -e "  ${GREEN}✓${RESET}  .env exists"
  PASS=$((PASS + 1))
else
  echo -e "  ${YELLOW}!${RESET}  .env not found — copying from .env.example"
  cp .env.example .env
  echo -e "  ${YELLOW}!${RESET}  Edit .env with your actual credentials before running the app"
  WARN=$((WARN + 1))
fi

# Count required env vars that are set
REQUIRED_VARS="DATABASE_URL ANTHROPIC_API_KEY CLERK_SECRET_KEY"
MISSING_VARS=""
for var in $REQUIRED_VARS; do
  val=$(grep "^${var}=" .env 2>/dev/null | cut -d= -f2-)
  if [[ -z "$val" || "$val" == *"placeholder"* || "$val" == *"your-"* ]]; then
    MISSING_VARS="$MISSING_VARS $var"
  fi
done

if [[ -z "$MISSING_VARS" ]]; then
  echo -e "  ${GREEN}✓${RESET}  Required env vars set (DATABASE_URL, ANTHROPIC_API_KEY, CLERK_SECRET_KEY)"
  PASS=$((PASS + 1))
else
  echo -e "  ${YELLOW}!${RESET}  Missing or placeholder values for:${MISSING_VARS}"
  WARN=$((WARN + 1))
fi

# ── 3. Dependencies ───────────────────────────────────────────────

echo ""
echo -e "${BOLD}[3/5] Dependencies${RESET}"

echo -e "  Installing Node dependencies..."
if pnpm install --frozen-lockfile 2>&1 | tail -1; then
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}✗${RESET}  pnpm install failed"
  FAIL=$((FAIL + 1))
fi

# ── 4. Go CLIs ────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}[4/5] Go CLI Tools${RESET}"

if command -v go > /dev/null 2>&1; then
  GO_DIRS=$(ls -d pit* 2>/dev/null || true)
  if [[ -n "$GO_DIRS" ]]; then
    for d in $GO_DIRS; do
      if [[ -f "$d/Makefile" ]]; then
        echo -e "  Building $d..."
        if make -C "$d" build 2>&1 | tail -1; then
          echo -e "  ${GREEN}✓${RESET}  $d built"
          PASS=$((PASS + 1))
        else
          echo -e "  ${YELLOW}!${RESET}  $d build failed (non-critical)"
          WARN=$((WARN + 1))
        fi
      fi
    done
  fi
else
  echo -e "  ${YELLOW}!${RESET}  Go not installed — skipping CLI builds"
  echo -e "  ${YELLOW}!${RESET}  Install Go 1.25.7+ to build pitctl, pitforge, pitlab, pitbench, pitnet, pitstorm"
  WARN=$((WARN + 1))
fi

# ── 5. Validation ─────────────────────────────────────────────────

echo ""
echo -e "${BOLD}[5/5] Validation${RESET}"

echo -e "  Running typecheck..."
if pnpm run typecheck > /dev/null 2>&1; then
  echo -e "  ${GREEN}✓${RESET}  TypeScript compiles cleanly"
  PASS=$((PASS + 1))
else
  echo -e "  ${YELLOW}!${RESET}  TypeScript errors found (run 'pnpm run typecheck' for details)"
  WARN=$((WARN + 1))
fi

# ── Summary ───────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
TOTAL=$((PASS + FAIL + WARN))
echo -e "  ${GREEN}${PASS} passed${RESET}  ${RED}${FAIL} failed${RESET}  ${YELLOW}${WARN} warnings${RESET}  (${TOTAL} checks)"
echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"

if [[ "$FAIL" -gt 0 ]]; then
  echo ""
  echo -e "${RED}Bootstrap incomplete. Fix the failures above and re-run.${RESET}"
  exit 1
else
  echo ""
  echo -e "${GREEN}Bootstrap complete!${RESET}"
  echo ""
  echo "  Next steps:"
  echo "    1. Edit .env with your credentials (if not already done)"
  echo "    2. Run 'pnpm run dev' to start the development server"
  echo "    3. Visit http://localhost:3000"
  echo ""
  exit 0
fi
