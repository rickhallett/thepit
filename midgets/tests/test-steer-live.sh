#!/bin/bash
# Live steering test - proves agent acts on mid-flight instructions.
# Requires ANTHROPIC_API_KEY. Costs API tokens. Non-deterministic.
# Runs on HOST. NOT part of the gate.
set -euo pipefail

IMAGE="midget-poc"
PASS=0
FAIL=0
CONTAINER=""
TIMEOUT=60

pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }
cleanup() {
    if [ -n "$CONTAINER" ]; then
        docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    fi
}
trap cleanup EXIT

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
    echo "ERROR: ANTHROPIC_API_KEY not set" >&2
    exit 1
fi

echo "=== Live Steering Tests (costs API tokens) ==="
echo ""

# ── Test 1: steer changes agent behaviour ────────────────────

echo "--- Test 1: infrastructure steer (stream-json pipe) ---"

CONTAINER=$(docker run -d \
    --label midget=true \
    --label midget.role=steer-live \
    --cpus 2 --memory 4g \
    -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
    "$IMAGE" sleep 300)
CID="${CONTAINER:0:12}"

# Set up the pipe and watcher
docker exec "$CONTAINER" /opt/steer/steer-watcher --steer-dir /tmp/steer --pipe /tmp/steer/agent.pipe --setup >/dev/null 2>&1
docker exec -d "$CONTAINER" /opt/steer/steer-watcher --steer-dir /tmp/steer --pipe /tmp/steer/agent.pipe

# Start claude reading from the pipe, writing output to a file
# --input-format stream-json reads JSON messages from stdin
# The pipe blocks until we write to it
docker exec -d "$CONTAINER" bash -c "
    claude -p \
        --input-format stream-json \
        --output-format stream-json \
        --verbose \
        --dangerously-skip-permissions \
        < /tmp/steer/agent.pipe \
        > /tmp/agent-output.jsonl \
        2>/tmp/agent-stderr.log
"
sleep 2

# Send initial task
TASK='{"type":"user","message":{"role":"user","content":"Write a Python function called add_numbers that adds two numbers and returns the result. Output only the code, no explanation."}}'
docker exec "$CONTAINER" bash -c "printf '%s\n' '$TASK' > /tmp/steer/001-task.json"

echo "  Sent initial task (Python), waiting for response..."
sleep 15

# Check for Python output
OUTPUT1=$(docker exec "$CONTAINER" cat /tmp/agent-output.jsonl 2>/dev/null || true)
if printf '%s' "$OUTPUT1" | grep -q "def add_numbers"; then
    pass "agent produced Python function"
else
    # Check stderr for errors
    STDERR=$(docker exec "$CONTAINER" cat /tmp/agent-stderr.log 2>/dev/null || true)
    if [ -n "$STDERR" ]; then
        echo "  stderr: $STDERR" | head -3
    fi
    fail "agent produced Python function (output length: ${#OUTPUT1})"
fi

# Now steer: switch to Rust
STEER='{"type":"user","message":{"role":"user","content":"Now rewrite that same function in Rust. Output only the Rust code, no explanation."}}'
docker exec "$CONTAINER" bash -c "printf '%s\n' '$STEER' > /tmp/steer/002-steer.json"

echo "  Sent steer (Rust), waiting for response..."
sleep 15

# Check for Rust output
# Must match multiple Rust-specific tokens to avoid false positives.
# "fn " alone matches English ("function"). Require fn + type annotation.
OUTPUT2=$(docker exec "$CONTAINER" cat /tmp/agent-output.jsonl 2>/dev/null || true)
HAS_FN_DECL=$(printf '%s' "$OUTPUT2" | grep -cE "fn [a-z_]+\(" || true)
HAS_RUST_TYPE=$(printf '%s' "$OUTPUT2" | grep -cE "(i32|i64|f64|usize|-> )" || true)
if [ "$HAS_FN_DECL" -ge 1 ] && [ "$HAS_RUST_TYPE" -ge 1 ]; then
    pass "agent switched to Rust after steer (fn decl + type annotation)"
else
    fail "agent switched to Rust after steer (fn_decl=$HAS_FN_DECL, rust_type=$HAS_RUST_TYPE)"
fi

# T1.3: verify both outputs exist (agent processed both messages)
HAS_PYTHON=$(printf '%s' "$OUTPUT2" | grep -c "def add_numbers" || true)
if [ "$HAS_PYTHON" -ge 1 ] && [ "$HAS_FN_DECL" -ge 1 ] && [ "$HAS_RUST_TYPE" -ge 1 ]; then
    pass "agent acted on both initial task and mid-flight steer"
else
    fail "agent acted on both messages (python=$HAS_PYTHON, fn=$HAS_FN_DECL, type=$HAS_RUST_TYPE)"
fi

docker rm -f "$CONTAINER" >/dev/null 2>&1
CONTAINER=""

echo ""

# ── Test 2: signal changes agent behaviour ───────────────────

echo "--- Test 2: prompt-based signal (file poll) ---"

CONTAINER=$(docker run -d \
    --label midget=true \
    --label midget.role=signal-live \
    --cpus 2 --memory 4g \
    -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
    "$IMAGE" sleep 300)
CID="${CONTAINER:0:12}"

# Write the steering file first (agent will see it from the start)
bin/midgetctl signal "$CID" "When you see this file, include the word STEERED in your response." >/dev/null 2>&1

# Find the steer dir
SDIR=$(docker exec "$CONTAINER" bash -c \
    "if [ -d /opt/jobs/steer ]; then echo /opt/jobs/steer; else echo /tmp/steer; fi")

# Run claude with a prompt that tells it to check the steering file
docker exec "$CONTAINER" bash -c "
    claude -p \
        --dangerously-skip-permissions \
        'Before responding, read the file at $SDIR/instructions.md if it exists and follow any instructions there. Then: say hello and describe what you are.' \
        > /tmp/signal-output.txt \
        2>/tmp/signal-stderr.log
" &
CLAUDE_PID=$!

# Wait for completion (with timeout)
WAITED=0
while kill -0 $CLAUDE_PID 2>/dev/null && [ $WAITED -lt $TIMEOUT ]; do
    sleep 2
    WAITED=$((WAITED + 2))
done

if kill -0 $CLAUDE_PID 2>/dev/null; then
    kill $CLAUDE_PID 2>/dev/null || true
    fail "agent timed out after ${TIMEOUT}s"
else
    OUTPUT=$(docker exec "$CONTAINER" cat /tmp/signal-output.txt 2>/dev/null || true)
    if printf '%s' "$OUTPUT" | grep -qi "STEERED"; then
        pass "agent read signal file and included keyword"
    else
        echo "  Output: $(printf '%s' "$OUTPUT" | head -c 200)"
        fail "agent read signal file and included keyword"
    fi
fi

docker rm -f "$CONTAINER" >/dev/null 2>&1
CONTAINER=""

echo ""

# ── Results ──────────────────────────────────────────────────

echo "=== Results: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -eq 0 ]; then
    echo "LIVE STEERING TESTS PASSED"
    exit 0
else
    echo "LIVE STEERING TESTS FAILED"
    exit 1
fi
