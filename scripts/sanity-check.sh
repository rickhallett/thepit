#!/usr/bin/env bash
# sanity-check.sh — Smoke test major routes on a local dev server.
#
# Usage:
#   ./scripts/sanity-check.sh          # starts dev server, tests, stops it
#   ./scripts/sanity-check.sh --url http://localhost:3000  # test an already-running server
#
# Exit code: 0 if all checks pass, 1 if any fail.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
RESET='\033[0m'

BASE_URL="${BASE_URL:-http://localhost:3000}"
DEV_PID=""
PASS=0
FAIL=0
WARN=0
STARTED_SERVER=false

cleanup() {
  if [[ "$STARTED_SERVER" == true && -n "$DEV_PID" ]]; then
    echo ""
    echo -e "${BOLD}Stopping dev server (PID $DEV_PID)...${RESET}"
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# ── Helpers ──────────────────────────────────────────────────────────

check_route() {
  local method="${1}"
  local path="${2}"
  local expected_status="${3}"
  local label="${4:-$method $path}"
  local min_bytes="${5:-50}"
  local extra_args="${6:-}"

  local url="${BASE_URL}${path}"
  local response
  local http_code
  local body_size

  response=$(curl -s -o /dev/null -w '%{http_code} %{size_download}' \
    -X "$method" \
    -H "User-Agent: sanity-check/1.0" \
    $extra_args \
    --max-time 60 \
    "$url" 2>/dev/null) || response="000 0"

  http_code=$(echo "$response" | awk '{print $1}')
  body_size=$(echo "$response" | awk '{print $2}')

  if [[ "$http_code" == "$expected_status" ]]; then
    if [[ "$body_size" -ge "$min_bytes" ]]; then
      echo -e "  ${GREEN}PASS${RESET}  $label  (HTTP $http_code, ${body_size}B)"
      PASS=$((PASS + 1))
    else
      echo -e "  ${YELLOW}WARN${RESET}  $label  (HTTP $http_code, only ${body_size}B — expected >=${min_bytes}B)"
      WARN=$((WARN + 1))
    fi
  else
    echo -e "  ${RED}FAIL${RESET}  $label  (got HTTP $http_code, expected $expected_status)"
    FAIL=$((FAIL + 1))
  fi
}

check_contains() {
  local path="${1}"
  local needle="${2}"
  local label="${3:-GET $path contains '$needle'}"

  local body
  body=$(curl -s --max-time 60 -H "User-Agent: sanity-check/1.0" "${BASE_URL}${path}" 2>/dev/null) || body=""

  if echo "$body" | grep -qF "$needle"; then
    echo -e "  ${GREEN}PASS${RESET}  $label"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${RESET}  $label  (needle not found in response)"
    FAIL=$((FAIL + 1))
  fi
}

wait_for_server() {
  local max_wait=60
  local waited=0
  echo -n "Waiting for server at ${BASE_URL}"
  while true; do
    local status
    status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "${BASE_URL}/api/health" 2>/dev/null || echo "000")
    if [[ "$status" == "200" ]]; then
      break
    fi
    sleep 1
    ((waited++))
    echo -n "."
    if [[ $waited -ge $max_wait ]]; then
      echo ""
      echo -e "${RED}Server did not become ready within ${max_wait}s${RESET}"
      exit 1
    fi
  done
  echo " ready (${waited}s)"
}

# ── Optionally start dev server ──────────────────────────────────────

if [[ "${1:-}" == "--url" && -n "${2:-}" ]]; then
  BASE_URL="$2"
  echo -e "${BOLD}Using existing server at ${BASE_URL}${RESET}"
else
  # Check if something is already running on port 3000
  if curl -s -o /dev/null --max-time 2 "${BASE_URL}/api/health" 2>/dev/null; then
    echo -e "${BOLD}Server already running at ${BASE_URL}${RESET}"
  else
    echo -e "${BOLD}Starting dev server...${RESET}"
    npm run dev > /tmp/tspit-dev-server.log 2>&1 &
    DEV_PID=$!
    STARTED_SERVER=true
    wait_for_server
  fi
fi

echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  Sanity Check — $(date '+%Y-%m-%d %H:%M:%S')${RESET}"
echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
echo ""

# ── 1. Health endpoint ───────────────────────────────────────────────

echo -e "${BOLD}[1/8] Health & Infrastructure${RESET}"
check_route GET "/api/health" 200 "GET /api/health" 2

# ── 2. Static / meta routes ─────────────────────────────────────────

echo ""
echo -e "${BOLD}[2/8] SEO & Meta Routes${RESET}"
check_route GET "/robots.txt" 200 "GET /robots.txt" 50
check_contains "/robots.txt" "Disallow: /api/"  "robots.txt blocks /api/"
check_contains "/robots.txt" "Sitemap:"          "robots.txt has sitemap link"
check_route GET "/sitemap.xml" 200 "GET /sitemap.xml" 100
check_contains "/sitemap.xml" "<urlset" "sitemap.xml is valid XML urlset"

# ── 3. Public pages (SSR / RSC) ─────────────────────────────────────

echo ""
echo -e "${BOLD}[3/8] Public Pages (SSR)${RESET}"
check_route GET "/" 200 "GET / (homepage)" 500
check_route GET "/arena" 200 "GET /arena" 500
check_route GET "/leaderboard" 200 "GET /leaderboard" 200
check_route GET "/research" 200 "GET /research" 200
check_route GET "/contact" 200 "GET /contact" 200
check_route GET "/privacy" 200 "GET /privacy" 200
check_route GET "/terms" 200 "GET /terms" 200
check_route GET "/disclaimer" 200 "GET /disclaimer" 200
check_route GET "/security" 200 "GET /security" 200
check_route GET "/roadmap" 200 "GET /roadmap" 200
check_route GET "/agents" 200 "GET /agents" 200
check_route GET "/feedback" 200 "GET /feedback" 200

# ── 4. API routes (GET endpoints) ───────────────────────────────────

echo ""
echo -e "${BOLD}[4/8] API GET Endpoints${RESET}"
check_route GET "/api/openapi" 401 "GET /api/openapi (requires auth)" 10
check_route GET "/docs/api" 200 "GET /docs/api (API docs)" 200
check_route GET "/api/feature-requests" 200 "GET /api/feature-requests" 10

# ── 5. API routes (validate they respond, not 500) ──────────────────

echo ""
echo -e "${BOLD}[5/8] API Route Validation (expect non-500 responses)${RESET}"
# These routes validate input before auth, so they return 400 for missing body
check_route POST "/api/run-bout" 400 "POST /api/run-bout (no body → 400)" 5
check_route POST "/api/winner-vote" 400 "POST /api/winner-vote (no body → 400)" 5
check_route POST "/api/reactions" 400 "POST /api/reactions (no body → 400)" 5

# ── 6. Internal/admin routes (should reject) ────────────────────────

echo ""
echo -e "${BOLD}[6/8] Internal / Admin Routes${RESET}"
check_route POST "/api/pv" 403 "POST /api/pv (no secret → 403)" 5
check_route POST "/api/admin/seed-agents" 401 "POST /api/admin/seed-agents (no token → 401)" 5

# ── 7. Middleware checks ─────────────────────────────────────────────

echo ""
echo -e "${BOLD}[7/8] Middleware Behavior${RESET}"

# Check that session cookie is set
session_cookie=$(curl -s -D - -o /dev/null --max-time 60 \
  -H "User-Agent: sanity-check/1.0" \
  "${BASE_URL}/" 2>/dev/null | grep -i 'set-cookie.*pit_sid' || true)
if [[ -n "$session_cookie" ]]; then
  echo -e "  ${GREEN}PASS${RESET}  Session cookie (pit_sid) set on first visit"
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}FAIL${RESET}  Session cookie (pit_sid) not set"
  FAIL=$((FAIL + 1))
fi

# Check that UTM params are captured
utm_cookie=$(curl -s -D - -o /dev/null --max-time 60 \
  -H "User-Agent: sanity-check/1.0" \
  "${BASE_URL}/?utm_source=test&utm_medium=check&utm_campaign=sanity" 2>/dev/null | grep -i 'set-cookie.*pit_utm' || true)
if [[ -n "$utm_cookie" ]]; then
  echo -e "  ${GREEN}PASS${RESET}  UTM cookie (pit_utm) set with UTM params"
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}FAIL${RESET}  UTM cookie (pit_utm) not set when UTM params present"
  FAIL=$((FAIL + 1))
fi

# Check CSP header is present
csp_header=$(curl -s -D - -o /dev/null --max-time 60 \
  -H "User-Agent: sanity-check/1.0" \
  "${BASE_URL}/" 2>/dev/null | grep -i 'content-security-policy' || true)
if [[ -n "$csp_header" ]]; then
  echo -e "  ${GREEN}PASS${RESET}  Content-Security-Policy header present"
  PASS=$((PASS + 1))
else
  echo -e "  ${YELLOW}WARN${RESET}  Content-Security-Policy header not found (may be dev-only)"
  WARN=$((WARN + 1))
fi

# ── 8. Short link redirect (expect 404 for non-existent slug) ──────

echo ""
echo -e "${BOLD}[8/8] Short Links & Edge Cases${RESET}"
# Non-existent short link should 404 or redirect
short_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 60 \
  -H "User-Agent: sanity-check/1.0" \
  "${BASE_URL}/s/nonexistent" 2>/dev/null) || short_code="000"
if [[ "$short_code" == "404" || "$short_code" == "307" || "$short_code" == "302" ]]; then
  echo -e "  ${GREEN}PASS${RESET}  GET /s/nonexistent (HTTP $short_code — expected 404 or redirect)"
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}FAIL${RESET}  GET /s/nonexistent (got HTTP $short_code, expected 404 or redirect)"
  FAIL=$((FAIL + 1))
fi

# Non-existent bout page (may return 200 with error UI or 404)
bout_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 60 \
  -H "User-Agent: sanity-check/1.0" \
  "${BASE_URL}/bout/nonexistent-id" 2>/dev/null) || bout_code="000"
if [[ "$bout_code" == "404" || "$bout_code" == "200" ]]; then
  echo -e "  ${GREEN}PASS${RESET}  GET /bout/nonexistent-id (HTTP $bout_code — route responds)"
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}FAIL${RESET}  GET /bout/nonexistent-id (got HTTP $bout_code, expected 200/404)"
  FAIL=$((FAIL + 1))
fi

# ── Summary ──────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
TOTAL=$((PASS + FAIL + WARN))
echo -e "  ${GREEN}${PASS} passed${RESET}  ${RED}${FAIL} failed${RESET}  ${YELLOW}${WARN} warnings${RESET}  (${TOTAL} total)"
echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"

if [[ "$FAIL" -gt 0 ]]; then
  echo -e "${RED}Some checks failed. Review output above.${RESET}"
  exit 1
else
  echo -e "${GREEN}All checks passed.${RESET}"
  exit 0
fi
