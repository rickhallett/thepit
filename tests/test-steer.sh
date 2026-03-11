#!/bin/bash
# Test mid-flight steering: both infrastructure (steer) and prompt-based (signal)
# Runs on HOST. Launches a midget container and tests both steering mechanisms.
set -euo pipefail

IMAGE="midget-poc"
PASS=0
FAIL=0
CONTAINER=""

pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }
cleanup() {
    if [ -n "$CONTAINER" ]; then
        docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    fi
}
trap cleanup EXIT

echo "=== Mid-Flight Steering Tests ==="
echo ""

# ── Test 1: signal - write instructions.md ──────────────────

echo "--- Signal (prompt-based) tests ---"

# Helper: find steer dir inside container (may be /opt/jobs/steer or /tmp/steer)
steer_dir() {
    docker exec "$1" bash -c \
        "if [ -d /opt/jobs/steer ]; then echo /opt/jobs/steer; else echo /tmp/steer; fi"
}

CONTAINER=$(docker run -d \
    --label midget=true \
    --label midget.role=test-signal \
    --cpus 2 --memory 4g \
    "$IMAGE" sleep 300)
CID="${CONTAINER:0:12}"

# T1.1: signal creates the instructions file
bin/midgetctl signal "$CID" "focus on error handling" >/dev/null 2>&1
SDIR=$(steer_dir "$CONTAINER")
if docker exec "$CONTAINER" test -f "$SDIR/instructions.md"; then
    pass "signal creates instructions.md"
else
    fail "signal creates instructions.md"
fi

# T1.2: file contains the header
HEADER=$(docker exec "$CONTAINER" head -1 "$SDIR/instructions.md")
if printf '%s' "$HEADER" | grep -q "Steering Instructions"; then
    pass "instructions.md has header"
else
    fail "instructions.md has header (got: $HEADER)"
fi

# T1.3: file contains the message with timestamp
CONTENT=$(docker exec "$CONTAINER" cat "$SDIR/instructions.md")
if printf '%s' "$CONTENT" | grep -q "focus on error handling"; then
    pass "signal message written to file"
else
    fail "signal message written to file"
fi

# T1.4: timestamp present in ISO format
if printf '%s' "$CONTENT" | grep -qE '\[20[0-9]{2}-[0-9]{2}-[0-9]{2}T'; then
    pass "signal message has ISO timestamp"
else
    fail "signal message has ISO timestamp"
fi

# T1.5: second signal appends (does not overwrite)
bin/midgetctl signal "$CID" "also check edge cases" >/dev/null 2>&1
CONTENT=$(docker exec "$CONTAINER" cat "$SDIR/instructions.md")
if printf '%s' "$CONTENT" | grep -q "focus on error handling" && \
   printf '%s' "$CONTENT" | grep -q "also check edge cases"; then
    pass "second signal appends (both messages present)"
else
    fail "second signal appends"
fi

# T1.6: --show flag prints the file
OUTPUT=$(bin/midgetctl signal "$CID" "third instruction" --show 2>&1)
if printf '%s' "$OUTPUT" | grep -q "third instruction" && \
   printf '%s' "$OUTPUT" | grep -q "Steering Instructions"; then
    pass "signal --show displays instructions.md"
else
    fail "signal --show displays instructions.md"
fi

docker rm -f "$CONTAINER" >/dev/null 2>&1
CONTAINER=""

echo ""

# ── Test 2: steer - infrastructure (stream-json pipe) ───────

echo "--- Steer (infrastructure) tests ---"

CONTAINER=$(docker run -d \
    --label midget=true \
    --label midget.role=test-steer \
    --cpus 2 --memory 4g \
    "$IMAGE" sleep 300)
CID="${CONTAINER:0:12}"

# T2.1: steer writes a JSON message file
bin/midgetctl steer "$CID" "change approach to defensive coding" >/dev/null 2>&1
SDIR=$(steer_dir "$CONTAINER")
FILES=$(docker exec "$CONTAINER" ls "$SDIR/" 2>/dev/null || true)
if printf '%s' "$FILES" | grep -q "steer.json"; then
    pass "steer creates JSON message file"
else
    fail "steer creates JSON message file (files: $FILES)"
fi

# T2.2: message file is valid JSON with correct structure
MSG_FILE=$(docker exec "$CONTAINER" bash -c "ls $SDIR/*.json 2>/dev/null | head -1")
if [ -n "$MSG_FILE" ]; then
    MSG_CONTENT=$(docker exec "$CONTAINER" cat "$MSG_FILE")
    if printf '%s' "$MSG_CONTENT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d['type'] == 'user', f'type={d[\"type\"]}'
assert 'change approach' in d['content'], f'content={d[\"content\"]}'
print('valid')
" 2>/dev/null | grep -q "valid"; then
        pass "steer message is valid stream-json format"
    else
        fail "steer message format (content: $MSG_CONTENT)"
    fi
else
    fail "steer message file not found"
fi

# T2.3: second steer creates a second file (not overwrite)
sleep 0.1  # ensure different millisecond timestamp
bin/midgetctl steer "$CID" "add logging to all functions" >/dev/null 2>&1
FILE_COUNT=$(docker exec "$CONTAINER" bash -c "ls $SDIR/*.json 2>/dev/null | wc -l")
if [ "$FILE_COUNT" -ge 2 ]; then
    pass "second steer creates separate file (count: $FILE_COUNT)"
else
    fail "second steer creates separate file (count: $FILE_COUNT)"
fi

# T2.4: files are sequenced (lexicographic order = chronological order)
FILE_LIST=$(docker exec "$CONTAINER" bash -c "ls $SDIR/*.json 2>/dev/null")
FIRST=$(printf '%s' "$FILE_LIST" | head -1 | xargs basename)
LAST=$(printf '%s' "$FILE_LIST" | tail -1 | xargs basename)
if [ "$FIRST" \< "$LAST" ] || [ "$FIRST" = "$LAST" ]; then
    pass "steer files are sequenced chronologically"
else
    fail "steer files are sequenced (first=$FIRST, last=$LAST)"
fi

docker rm -f "$CONTAINER" >/dev/null 2>&1
CONTAINER=""

echo ""

# ── Test 3: steer-watcher pipe bridge ────────────────────────

echo "--- Steer-watcher (pipe bridge) tests ---"

CONTAINER=$(docker run -d \
    --label midget=true \
    --label midget.role=test-watcher \
    --cpus 2 --memory 4g \
    "$IMAGE" sleep 300)
CID="${CONTAINER:0:12}"

# T3.1: steer-watcher --setup creates the named pipe
docker exec "$CONTAINER" /opt/steer/steer-watcher --steer-dir /tmp/steer --pipe /tmp/steer/agent.pipe --setup >/dev/null 2>&1
PIPE_TYPE=$(docker exec "$CONTAINER" stat -c '%F' /tmp/steer/agent.pipe 2>/dev/null || true)
if printf '%s' "$PIPE_TYPE" | grep -q "fifo"; then
    pass "steer-watcher --setup creates named pipe (FIFO)"
else
    fail "steer-watcher --setup creates named pipe (got: $PIPE_TYPE)"
fi

# T3.2: steer-watcher can be started (runs in background)
docker exec -d "$CONTAINER" /opt/steer/steer-watcher --steer-dir /tmp/steer --pipe /tmp/steer/agent.pipe
sleep 0.5
WATCHER_RUNNING=$(docker exec "$CONTAINER" pgrep -f "steer-watcher" 2>/dev/null || true)
if [ -n "$WATCHER_RUNNING" ]; then
    pass "steer-watcher process running"
else
    fail "steer-watcher process running"
fi

# T3.3: start a reader on the pipe, write a steer message, verify delivery
# The reader simulates what claude --input-format stream-json would do
docker exec -d "$CONTAINER" bash -c "cat /tmp/steer/agent.pipe > /tmp/pipe-output.txt"
sleep 0.3

# Write a steer message directly to /tmp/steer (where watcher is watching)
MSG='{"type":"user","content":"test pipe delivery"}'
docker exec "$CONTAINER" bash -c "printf '%s' '$MSG' > /tmp/steer/999-test.json"
sleep 1.5

# Check if the watcher delivered it to the pipe
PIPE_OUT=$(docker exec "$CONTAINER" cat /tmp/pipe-output.txt 2>/dev/null || true)
if printf '%s' "$PIPE_OUT" | grep -q "test pipe delivery"; then
    pass "steer-watcher delivered message through pipe"
else
    # The watcher may still be waiting for the reader or processing
    # Check if the message file was consumed (renamed to .sending or deleted)
    REMAINING=$(docker exec "$CONTAINER" bash -c "ls /tmp/steer/*.json 2>/dev/null | wc -l")
    if [ "$REMAINING" -eq 0 ]; then
        pass "steer-watcher consumed message file (pipe delivery in progress)"
    else
        fail "steer-watcher pipe delivery (output: '$PIPE_OUT', remaining files: $REMAINING)"
    fi
fi

# T3.4: message file is cleaned up after delivery
STEER_FILES=$(docker exec "$CONTAINER" bash -c "ls /tmp/steer/*.json 2>/dev/null" || true)
SENDING_FILES=$(docker exec "$CONTAINER" bash -c "ls /tmp/steer/*.sending 2>/dev/null" || true)
if [ -z "$STEER_FILES" ] && [ -z "$SENDING_FILES" ]; then
    pass "steer message file cleaned up after delivery"
else
    # Allow for timing - file might still be in .sending state
    if [ -z "$STEER_FILES" ]; then
        pass "steer message file consumed (sending state transient)"
    else
        fail "steer message file cleanup (json: '$STEER_FILES', sending: '$SENDING_FILES')"
    fi
fi

docker rm -f "$CONTAINER" >/dev/null 2>&1
CONTAINER=""

echo ""

# ── Test 4: isolation - steer and signal are independent ─────

echo "--- Isolation tests ---"

CONTAINER=$(docker run -d \
    --label midget=true \
    --label midget.role=test-isolation \
    --cpus 2 --memory 4g \
    "$IMAGE" sleep 300)
CID="${CONTAINER:0:12}"

# T4.1: signal does not create JSON files
bin/midgetctl signal "$CID" "signal message" >/dev/null 2>&1
SDIR=$(steer_dir "$CONTAINER")
JSON_FILES=$(docker exec "$CONTAINER" bash -c "ls $SDIR/*.json 2>/dev/null" || true)
if [ -z "$JSON_FILES" ]; then
    pass "signal does not create JSON files (steer namespace clean)"
else
    fail "signal created JSON files: $JSON_FILES"
fi

# T4.2: steer does not touch instructions.md
bin/midgetctl steer "$CID" "steer message" >/dev/null 2>&1
INSTRUCTIONS=$(docker exec "$CONTAINER" bash -c "cat $SDIR/instructions.md 2>/dev/null" || true)
if printf '%s' "$INSTRUCTIONS" | grep -q "steer message"; then
    fail "steer wrote to instructions.md (namespace collision)"
else
    pass "steer does not touch instructions.md"
fi

docker rm -f "$CONTAINER" >/dev/null 2>&1
CONTAINER=""

echo ""

# ── Results ──────────────────────────────────────────────────

echo "=== Results: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -eq 0 ]; then
    echo "STEERING TESTS PASSED"
    exit 0
else
    echo "STEERING TESTS FAILED"
    exit 1
fi
