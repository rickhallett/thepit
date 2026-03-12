#!/bin/bash
# Midget A5 — Agent framework test suite.
# Run inside the container: /opt/test-agent.sh
#
# Proves the full agent loop: observe (steer) -> act (drive) -> verify (steer+drive)
# No LLM required for this gate test — deterministic scripted loop.
# When claude is inside the container, the scripted decisions become LLM decisions.
#
# Tests:
#   1. Node.js installed and functional
#   2. claude CLI installed and reports version
#   3. Scripted agent loop: observe -> act -> verify output via terminal
#   4. Cross-tool integration: drive runs steer from inside tmux
#      (proves the agent can use all its tools from a single session)

set -e

PASS=0
FAIL=0
STEER="/opt/steer/steer"
DRIVE="/opt/steer/drive"
SESSION="agent-test-$$"

pass() { PASS=$((PASS + 1)); printf "  PASS: %s\n" "$1"; }
fail() { FAIL=$((FAIL + 1)); printf "  FAIL: %s\n" "$1" >&2; }

cleanup() {
    "$DRIVE" session kill "$SESSION" --json >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "=== Agent Framework Test Suite ==="
echo ""

# 1. Node.js installed
echo "[1/4] Node.js installed"
if NODE_VER=$(node --version 2>/dev/null); then
    pass "Node.js: $NODE_VER"
else
    fail "node not found in PATH"
fi

# 2. claude CLI installed
echo "[2/4] claude CLI installed"
# claude --version may exit non-zero without API key; check for the binary
if CLAUDE_PATH=$(command -v claude 2>/dev/null); then
    # Try version flag; accept any output including error output
    CLAUDE_OUT=$(claude --version 2>&1 || true)
    pass "claude found at $CLAUDE_PATH (output: $(echo "$CLAUDE_OUT" | head -1))"
else
    fail "claude not found in PATH"
fi

# 3. Scripted agent loop: observe -> act -> verify
echo "[3/4] Scripted agent loop (observe -> act -> verify)"
#
# This is the skeleton every LLM-driven agent will use:
#   Step 1 — observe: capture initial screen state
#   Step 2 — act:     create work session, run task
#   Step 3 — verify:  check output matches expectation
#   Step 4 — report:  structured result

# Step 1: Observe initial state
OBSERVE=$($STEER see --json 2>/dev/null)
INITIAL_OK=$(echo "$OBSERVE" | python3 -c "import sys,json; print(json.load(sys.stdin)['ok'])" 2>/dev/null)
if [ "$INITIAL_OK" != "True" ]; then
    fail "agent observe (steer see) failed"
else

    # Step 2: Act — create work session, run a task
    $DRIVE session create "$SESSION" --json >/dev/null 2>&1

    # Task: write a file and verify its contents
    TASK_CMD='echo "AGENT_TASK_COMPLETE:$(date +%s)" > /tmp/agent-result.txt && cat /tmp/agent-result.txt'
    RUN_RESULT=$($DRIVE run "$SESSION" "$TASK_CMD" --json 2>/dev/null)
    RUN_EXIT=$(echo "$RUN_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['exit_code'])" 2>/dev/null)
    RUN_OUTPUT=$(echo "$RUN_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['output'])" 2>/dev/null)

    # Step 3: Verify — output contains expected token
    if [ "$RUN_EXIT" = "0" ] && echo "$RUN_OUTPUT" | grep -q "AGENT_TASK_COMPLETE"; then

        # Step 4: Verify persisted result via second read
        VERIFY=$($DRIVE run "$SESSION" "cat /tmp/agent-result.txt" --json 2>/dev/null)
        VERIFY_OUT=$(echo "$VERIFY" | python3 -c "import sys,json; print(json.load(sys.stdin)['output'])" 2>/dev/null)

        if echo "$VERIFY_OUT" | grep -q "AGENT_TASK_COMPLETE"; then
            pass "observe->act->verify loop complete (output: $(echo "$RUN_OUTPUT" | head -1))"
        else
            fail "verify step failed: file not readable (got: $VERIFY_OUT)"
        fi
    else
        fail "act step failed: exit=$RUN_EXIT output=$(echo "$RUN_OUTPUT" | head -1)"
    fi
fi

# 4. Cross-tool integration: drive session runs steer, drive captures steer output
echo "[4/4] Cross-tool integration: drive runs steer see from tmux"
# The agent uses drive (terminal) to invoke steer (GUI) — both tools in one session
STEER_RUN=$($DRIVE run "$SESSION" "/opt/steer/steer see --json" --timeout 10 --json 2>/dev/null)
STEER_EXIT=$(echo "$STEER_RUN" | python3 -c "import sys,json; print(json.load(sys.stdin)['exit_code'])" 2>/dev/null)
STEER_OUT=$(echo "$STEER_RUN" | python3 -c "import sys,json; print(json.load(sys.stdin)['output'])" 2>/dev/null)

if [ "$STEER_EXIT" = "0" ] && echo "$STEER_OUT" | grep -q '"ok"'; then
    WIN_COUNT=$(echo "$STEER_OUT" | python3 -c "
import sys, json
# output is the raw text from tmux - find the JSON
import re
m = re.search(r'\{.*\}', sys.stdin.read(), re.DOTALL)
if m:
    try:
        d = json.loads(m.group(0))
        print(d.get('window_count', '?'))
    except Exception:
        print('?')
else:
    print('?')
" 2>/dev/null)
    pass "drive->steer integration: steer see ran from tmux, windows=$WIN_COUNT"
else
    fail "cross-tool integration failed: exit=$STEER_EXIT output=$(echo "$STEER_OUT" | head -2)"
fi

echo ""
printf "=== Results: %d passed, %d failed ===\n" "$PASS" "$FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then
    echo "AGENT FRAMEWORK TESTS FAILED"
    exit 1
else
    echo "AGENT FRAMEWORK TESTS PASSED — agent loop proven inside container"
    echo ""
    echo "What was demonstrated:"
    echo "  - Node.js installed (agent framework runtime)"
    echo "  - claude CLI present (LLM agent binary)"
    echo "  - observe->act->verify loop: steer sees, drive acts, drive verifies"
    echo "  - cross-tool integration: drive session runs steer see"
    echo ""
    echo "Next: run claude -p inside the container with ANTHROPIC_API_KEY"
    echo "  make agent-live ANTHROPIC_API_KEY=\$ANTHROPIC_API_KEY"
    exit 0
fi
