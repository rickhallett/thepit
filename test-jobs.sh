#!/bin/bash
# Midget C1 — Job server test suite.
# Run inside the container: /opt/test-jobs.sh
#
# Proves:
#   1. jobrunner status: reports pending/done counts
#   2. jobrunner --job: processes a specific job file, writes result
#   3. shell_command job: command executes, output captured, exit code correct
#   4. failing job: non-zero exit captured, verdict=fail
#   5. jobrunner once: processes first item from incoming/, removes it

set -e

PASS=0
FAIL=0
RUNNER="/opt/steer/jobrunner"
JOBS_DIR="/tmp/jobs"
INCOMING="$JOBS_DIR/incoming"
DONE_DIR="$JOBS_DIR/done"
export MIDGET_JOBS_DIR="$JOBS_DIR"

pass() { PASS=$((PASS + 1)); printf "  PASS: %s\n" "$1"; }
fail() { FAIL=$((FAIL + 1)); printf "  FAIL: %s\n" "$1" >&2; }

# Clean state
rm -rf "$JOBS_DIR"
mkdir -p "$INCOMING" "$DONE_DIR"

echo "=== Job Server Test Suite ==="
echo ""

# 1. jobrunner status (empty queues)
echo "[1/5] jobrunner status"
RESULT=$("$RUNNER" --json status 2>/dev/null || "$RUNNER" status --json 2>/dev/null)
PENDING=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['pending'])" 2>/dev/null)
DONE_COUNT=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['done'])" 2>/dev/null)
if [ "$PENDING" = "0" ] && [ "$DONE_COUNT" = "0" ]; then
    pass "status: pending=0, done=0"
else
    fail "status unexpected: $RESULT"
fi

# 2 + 3. shell_command job — passes
echo "[2/5] shell_command job (pass)"
JOB_ID="test-job-pass-001"
cat > "/tmp/job-pass.yaml" <<EOF
job_id: $JOB_ID
created: $(date -u +%Y-%m-%dT%H:%M:%SZ)
role: worker
task: shell_command
context:
  cmd: "echo JOB_OUTPUT_PROOF && printf 'line2\n'"
timeout: 30
EOF

"$RUNNER" --json job /tmp/job-pass.yaml > /tmp/job-pass-result.json 2>/dev/null || true

# Check result YAML was written
RESULT_YAML="$DONE_DIR/$JOB_ID.yaml"
if [ ! -f "$RESULT_YAML" ]; then
    fail "result YAML not written: $RESULT_YAML"
else
    EXIT_CODE=$(python3 -c "import yaml; d=yaml.safe_load(open('$RESULT_YAML')); print(d['exit_code'])" 2>/dev/null)
    VERDICT=$(python3 -c "import yaml; d=yaml.safe_load(open('$RESULT_YAML')); print(d['verdict'])" 2>/dev/null)
    OUTPUT=$(python3 -c "import yaml; d=yaml.safe_load(open('$RESULT_YAML')); print(d['output'])" 2>/dev/null)

    if [ "$EXIT_CODE" = "0" ] && [ "$VERDICT" = "pass" ]; then
        pass "shell_command: exit=0, verdict=pass"
    else
        fail "shell_command: exit=$EXIT_CODE, verdict=$VERDICT"
    fi

    # 3. output captured
    echo "[3/5] shell_command output captured"
    if echo "$OUTPUT" | grep -q "JOB_OUTPUT_PROOF"; then
        pass "output captured: $(echo "$OUTPUT" | head -1)"
    else
        fail "output missing expected token (got: $OUTPUT)"
    fi
fi

# 4. failing job — non-zero exit, verdict=fail
echo "[4/5] failing job (verdict=fail)"
JOB_ID_FAIL="test-job-fail-001"
cat > "/tmp/job-fail.yaml" <<EOF
job_id: $JOB_ID_FAIL
created: $(date -u +%Y-%m-%dT%H:%M:%SZ)
role: worker
task: shell_command
context:
  cmd: "bash -c 'exit 42'"
timeout: 10
EOF

"$RUNNER" --json job /tmp/job-fail.yaml > /dev/null 2>&1 || true

RESULT_YAML_FAIL="$DONE_DIR/$JOB_ID_FAIL.yaml"
if [ -f "$RESULT_YAML_FAIL" ]; then
    FAIL_VERDICT=$(python3 -c "import yaml; d=yaml.safe_load(open('$RESULT_YAML_FAIL')); print(d['verdict'])" 2>/dev/null)
    FAIL_EXIT=$(python3 -c "import yaml; d=yaml.safe_load(open('$RESULT_YAML_FAIL')); print(d['exit_code'])" 2>/dev/null)
    if [ "$FAIL_VERDICT" = "fail" ] && [ "$FAIL_EXIT" = "42" ]; then
        pass "failing job: exit=42, verdict=fail correctly recorded"
    else
        fail "failing job: verdict=$FAIL_VERDICT exit=$FAIL_EXIT (expected fail/42)"
    fi
else
    fail "result YAML not written for failing job"
fi

# 5. jobrunner once: picks up from incoming/
echo "[5/5] jobrunner once processes incoming/"
JOB_ID_ONCE="test-job-once-001"
cat > "$INCOMING/job-once.yaml" <<EOF
job_id: $JOB_ID_ONCE
created: $(date -u +%Y-%m-%dT%H:%M:%SZ)
role: worker
task: shell_command
context:
  cmd: "echo ONCE_PROOF"
timeout: 30
EOF

"$RUNNER" --json once > /dev/null 2>&1 || true

# incoming file should be gone, result should exist
RESULT_YAML_ONCE="$DONE_DIR/$JOB_ID_ONCE.yaml"
if [ ! -f "$INCOMING/job-once.yaml" ] && [ -f "$RESULT_YAML_ONCE" ]; then
    ONCE_VERDICT=$(python3 -c "import yaml; d=yaml.safe_load(open('$RESULT_YAML_ONCE')); print(d['verdict'])" 2>/dev/null)
    pass "once: incoming consumed, result written, verdict=$ONCE_VERDICT"
else
    STILL_THERE=""
    [ -f "$INCOMING/job-once.yaml" ] && STILL_THERE="incoming still present"
    [ ! -f "$RESULT_YAML_ONCE" ] && STILL_THERE="$STILL_THERE result missing"
    fail "once failed: $STILL_THERE"
fi

echo ""
printf "=== Results: %d passed, %d failed ===\n" "$PASS" "$FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then
    echo "JOB SERVER TESTS FAILED"
    exit 1
else
    echo "JOB SERVER TESTS PASSED — C1 job protocol proven"
    echo ""
    echo "What was demonstrated:"
    echo "  - jobrunner status: pending/done counts"
    echo "  - shell_command task: executes via drive+sentinel, captures output"
    echo "  - pass/fail verdict correctly set from exit code"
    echo "  - jobrunner once: picks up from incoming/, removes on completion"
    exit 0
fi
