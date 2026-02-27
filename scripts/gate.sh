#!/usr/bin/env bash
# Gate wrapper — runs the local gate and persists result to .keel-state
# Usage: ./scripts/gate.sh
# Exit code matches the gate result (0 = green, non-zero = red)

set -o pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
STATE="$ROOT/.keel-state"
LOGFILE=$(mktemp)

cleanup() { rm -f "$LOGFILE"; }
trap cleanup EXIT

echo "Running gate: typecheck → lint → test:unit"
echo

# Run gate, tee output to logfile for parsing
pnpm run typecheck && pnpm run lint && pnpm run test:unit 2>&1 | tee "$LOGFILE"
EXIT_CODE=${PIPESTATUS[0]}

# Parse test count from vitest output: "Tests  1125 passed"
TESTS=$(grep -oP '^\s*Tests\s+\K\d+(?=\s+passed)' "$LOGFILE" | tail -1)
TESTS=${TESTS:-0}

# Determine gate status
if [ "$EXIT_CODE" -eq 0 ]; then
  GATE="green"
else
  GATE="red"
fi

GATE_TIME=$(date +%H:%M)

# Write state file
cat > "$STATE" <<EOF
{"gate": "$GATE", "gate_time": "$GATE_TIME", "tests": $TESTS}
EOF

echo
echo "Gate: $GATE ($GATE_TIME) — $TESTS tests passed"
exit "$EXIT_CODE"
