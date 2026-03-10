#!/bin/bash
# Midget A2 — terminal protocol (drive) test suite.
# Run inside the container: /opt/test-drive.sh
#
# Proves:
#   1. drive session create — creates a tmux session
#   2. drive session list — lists sessions
#   3. drive run ls — runs a command, captures output
#   4. drive run git status — captures git output (or no-repo message)
#   5. drive run steer see — captures steer JSON output
#   6. drive logs — captures pane scrollback
#   7. drive poll — waits for a pattern
#   8. drive send — sends raw keystrokes without sentinel
#   9. drive session kill — kills session cleanly

set -e

PASS=0
FAIL=0
DRIVE="/opt/steer/drive"

pass() { PASS=$((PASS + 1)); printf "  PASS: %s\n" "$1"; }
fail() { FAIL=$((FAIL + 1)); printf "  FAIL: %s\n" "$1" >&2; }

SESSION="test-drive-$$"

cleanup() {
    "$DRIVE" session kill "$SESSION" --json >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "=== Drive Terminal Protocol Test Suite ==="
echo ""

# 1. session create
echo "[1/9] drive session create"
RESULT=$("$DRIVE" session create "$SESSION" --json 2>/dev/null)
if echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['ok'], d" 2>/dev/null; then
    pass "Session '$SESSION' created"
else
    fail "Session create failed: $RESULT"
fi

# 2. session list
echo "[2/9] drive session list"
RESULT=$("$DRIVE" session list --json 2>/dev/null)
FOUND=$(echo "$RESULT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('yes' if '$SESSION' in d['sessions'] else 'no')
" 2>/dev/null)
if [ "$FOUND" = "yes" ]; then
    pass "Session visible in list"
else
    fail "Session not in list: $RESULT"
fi

# 3. drive run ls
echo "[3/9] drive run ls"
RESULT=$("$DRIVE" run "$SESSION" "ls /tmp" --json 2>/dev/null)
EXIT_CODE=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['exit_code'])" 2>/dev/null)
if [ "$EXIT_CODE" = "0" ]; then
    OUTPUT=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['output'])" 2>/dev/null)
    pass "ls /tmp: exit 0, output: $(echo "$OUTPUT" | head -1)..."
else
    fail "ls /tmp failed: $RESULT"
fi

# 4. drive run git status (expected to fail - no repo in container)
echo "[4/9] drive run git status"
# In the container there's no git repo, so git status SHOULD fail.
# We verify: (a) drive captures the output, (b) output contains the expected
# error message. No || true - we need to see the real exit code.
RESULT=$("$DRIVE" run "$SESSION" "git status 2>&1" --json 2>/dev/null)
OK=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['ok'])" 2>/dev/null)
EXIT_CODE=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('exit_code', 'none'))" 2>/dev/null)
OUTPUT=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['output'])" 2>/dev/null)
# drive returns ok:true when the sentinel completes (even for non-zero exit)
# The git command should exit non-zero with "not a git repository" or similar
if [ "$OK" = "True" ] && echo "$OUTPUT" | grep -qiE "not a git repository|fatal|On branch"; then
    pass "git status output captured (exit=$EXIT_CODE): $(echo "$OUTPUT" | head -1)"
else
    fail "git status: unexpected result (ok=$OK exit=$EXIT_CODE output=$(echo "$OUTPUT" | head -1))"
fi

# 5. drive run steer see
echo "[5/9] drive run steer see"
RESULT=$("$DRIVE" run "$SESSION" "/opt/steer/steer see --json" --timeout 10 --json 2>/dev/null)
EXIT_CODE=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['exit_code'])" 2>/dev/null)
OUTPUT=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['output'])" 2>/dev/null)
if [ "$EXIT_CODE" = "0" ] && echo "$OUTPUT" | grep -q '"ok"'; then
    pass "steer see executed from tmux, JSON output captured"
else
    fail "steer see in tmux failed: exit=$EXIT_CODE output=$(echo "$OUTPUT" | head -2)"
fi

# 6. drive logs
echo "[6/9] drive logs"
RESULT=$("$DRIVE" logs "$SESSION" --lines 50 --json 2>/dev/null)
OK=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['ok'])" 2>/dev/null)
CONTENT=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['content'])" 2>/dev/null)
if [ "$OK" = "True" ] && [ -n "$CONTENT" ]; then
    pass "Pane logs captured ($(echo "$CONTENT" | wc -l) lines)"
else
    fail "logs failed: $RESULT"
fi

# 7. drive poll
echo "[7/9] drive poll"
# Send a command that will produce known output, then poll for it
"$DRIVE" send "$SESSION" "echo POLL_TARGET_SIGNAL" --json >/dev/null 2>&1
RESULT=$("$DRIVE" poll "$SESSION" --until "POLL_TARGET_SIGNAL" --timeout 5 --json 2>/dev/null)
OK=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['ok'])" 2>/dev/null)
if [ "$OK" = "True" ]; then
    MATCHED=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['matched'])" 2>/dev/null)
    pass "Pattern matched: $MATCHED"
else
    fail "poll failed: $RESULT"
fi

# 8. drive send (no-enter)
echo "[8/9] drive send --no-enter"
RESULT=$("$DRIVE" send "$SESSION" "echo NO_ENTER_TEST" --no-enter --json 2>/dev/null)
OK=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['ok'])" 2>/dev/null)
ENTER=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['enter'])" 2>/dev/null)
if [ "$OK" = "True" ] && [ "$ENTER" = "False" ]; then
    pass "send --no-enter: text staged without executing"
else
    fail "send --no-enter failed: $RESULT"
fi

# 9. session kill
echo "[9/9] drive session kill"
RESULT=$("$DRIVE" session kill "$SESSION" --json 2>/dev/null)
OK=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['ok'])" 2>/dev/null)
if [ "$OK" = "True" ]; then
    # Verify gone from list
    LIST=$("$DRIVE" session list --json 2>/dev/null)
    STILL_THERE=$(echo "$LIST" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('yes' if '$SESSION' in d['sessions'] else 'no')
" 2>/dev/null)
    if [ "$STILL_THERE" = "no" ]; then
        pass "Session killed and removed from list"
    else
        fail "Session still in list after kill"
    fi
else
    fail "Session kill failed: $RESULT"
fi

echo ""
printf "=== Results: %d passed, %d failed ===\n" "$PASS" "$FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then
    echo "DRIVE TESTS FAILED"
    exit 1
else
    echo "DRIVE TESTS PASSED — terminal protocol proven"
    echo ""
    echo "What was demonstrated:"
    echo "  - tmux session lifecycle (create, list, kill)"
    echo "  - sentinel protocol: command completion detection via __DONE_ marker"
    echo "  - exit code capture from sentinel marker"
    echo "  - output extraction between markers"
    echo "  - ls, git status, steer see all runnable from tmux"
    echo "  - capture-pane logs"
    echo "  - poll for pattern with timeout"
    echo "  - raw send without sentinel"
    exit 0
fi
