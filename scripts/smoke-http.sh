#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
PATHS=(
  "/"
  "/arena"
  "/leaderboard"
  "/agents"
  "/research"
  "/roadmap"
  "/contact"
)

echo "Smoke testing ${BASE_URL}"

for path in "${PATHS[@]}"; do
  status="$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${path}")"
  if [[ "${status}" != "200" ]]; then
    echo "FAIL ${path} -> ${status}"
    exit 1
  fi
  echo "OK ${path} -> ${status}"
done

echo "Smoke test complete."
