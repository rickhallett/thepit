#!/bin/bash
# Midget C4 — governance crew orchestration test suite.
# Runs on the HOST. Proves mount constraints and the crew pipeline plumbing
# WITHOUT LLM calls (deterministic, gate-safe).
#
# Proves:
#   1. Sample repo with defect can be staged on shared volume
#   2. Dev-midget: full write access to repo (can modify files)
#   3. Watchdog-midget: read-only mount on repo (cannot modify source)
#   4. Weaver-midget: read-only mount on repo (cannot modify source)
#   5. Sentinel-midget: read-only mount on repo (cannot modify source)
#   6. All crew write results to artifacts/ (shared volume, writable)
#   7. Orchestrator collects all 4 results
#   8. docker inspect confirms mount flags match SPEC.md

set -e

PASS=0
FAIL=0
IMAGE="midget-poc"
VOL_REPO="crew-repo-$$"
VOL_JOBS="crew-jobs-$$"

pass() { PASS=$((PASS + 1)); printf "  PASS: %s\n" "$1"; }
fail() { FAIL=$((FAIL + 1)); printf "  FAIL: %s\n" "$1" >&2; }

cleanup() {
    docker rm -f "crew-inspect-$$" >/dev/null 2>&1 || true
    docker volume rm "$VOL_REPO" "$VOL_JOBS" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "=== C4 Governance Crew Test Suite ==="
echo "  repo volume: $VOL_REPO"
echo "  jobs volume: $VOL_JOBS"
echo ""

# 1. Create volumes + sample repo with a deliberate defect
echo "[1/8] Stage sample repo with defect"
docker volume create "$VOL_REPO" >/dev/null 2>&1
docker volume create "$VOL_JOBS" >/dev/null 2>&1

# Init both volumes with correct ownership
docker run --rm --entrypoint bash -u root \
    -v "$VOL_REPO":/opt/repo \
    -v "$VOL_JOBS":/opt/jobs \
    "$IMAGE" \
    -c "mkdir -p /opt/jobs/incoming /opt/jobs/done /opt/jobs/artifacts && \
        chown -R 1000:1000 /opt/repo /opt/jobs"

# Write a Python file with a deliberate off-by-one bug
docker run --rm -i --entrypoint bash \
    -v "$VOL_REPO":/opt/repo \
    "$IMAGE" \
    -c "cat > /opt/repo/calc.py" << 'PYEOF'
def average(numbers):
    """Return the average of a list of numbers."""
    total = sum(numbers)
    return total / (len(numbers) - 1)  # BUG: off-by-one, should be len(numbers)

def clamp(value, low, high):
    """Clamp value between low and high."""
    if value < low:
        return low
    if value > high:
        return high
    return value
PYEOF

# Write the diff to the jobs artifacts volume
docker run --rm -i --entrypoint bash \
    -v "$VOL_JOBS":/opt/jobs \
    "$IMAGE" \
    -c "cat > /opt/jobs/artifacts/diff.patch" << 'DIFFEOF'
--- /dev/null
+++ b/calc.py
@@ -0,0 +1,12 @@
+def average(numbers):
+    """Return the average of a list of numbers."""
+    total = sum(numbers)
+    return total / (len(numbers) - 1)  # BUG: off-by-one
+
+def clamp(value, low, high):
+    """Clamp value between low and high."""
+    if value < low:
+        return low
+    if value > high:
+        return high
+    return value
DIFFEOF

pass "sample repo + diff staged"

# 2. Dev-midget: full write access (can create/modify files in repo)
echo "[2/8] Dev-midget: write access to repo"
DEV_RESULT=$(docker run --rm \
    --entrypoint bash \
    -v "$VOL_REPO":/opt/repo \
    -v "$VOL_JOBS":/opt/jobs \
    "$IMAGE" \
    -c "echo 'dev was here' >> /opt/repo/calc.py && echo 'WRITE_OK'")

if echo "$DEV_RESULT" | grep -q "WRITE_OK"; then
    pass "dev-midget: write to repo succeeded"
else
    fail "dev-midget: write to repo failed"
fi

# Restore the file
docker run --rm -i --entrypoint bash \
    -v "$VOL_REPO":/opt/repo \
    "$IMAGE" \
    -c "cat > /opt/repo/calc.py" << 'PYEOF'
def average(numbers):
    """Return the average of a list of numbers."""
    total = sum(numbers)
    return total / (len(numbers) - 1)  # BUG: off-by-one, should be len(numbers)

def clamp(value, low, high):
    """Clamp value between low and high."""
    if value < low:
        return low
    if value > high:
        return high
    return value
PYEOF

# 3. Watchdog-midget: read-only mount on repo, writable artifacts
echo "[3/8] Watchdog-midget: read-only repo, writable artifacts"
WATCHDOG_RESULT=$(docker run --rm \
    --entrypoint bash \
    -v "$VOL_REPO":/opt/repo:ro \
    -v "$VOL_JOBS":/opt/jobs \
    "$IMAGE" \
    -c "{ cat /opt/repo/calc.py > /dev/null && echo 'READ_OK'; } && \
        { echo 'test' > /opt/repo/hack.py 2>/dev/null && echo 'WRITE_ALLOWED' || echo 'WRITE_BLOCKED'; } && \
        { printf 'verdict: pass\n' > /opt/jobs/artifacts/watchdog-review.yaml && echo 'ARTIFACT_OK'; }")

if echo "$WATCHDOG_RESULT" | grep -q "READ_OK"; then
    pass "watchdog: can read repo"
else
    fail "watchdog: cannot read repo"
fi
if echo "$WATCHDOG_RESULT" | grep -q "WRITE_BLOCKED"; then
    pass "watchdog: write to repo blocked (read-only mount)"
else
    fail "watchdog: write to repo was NOT blocked"
fi
if echo "$WATCHDOG_RESULT" | grep -q "ARTIFACT_OK"; then
    pass "watchdog: can write to artifacts/"
else
    fail "watchdog: cannot write to artifacts/"
fi

# 4. Weaver-midget: same constraints as watchdog
echo "[4/8] Weaver-midget: read-only repo, writable artifacts"
WEAVER_RESULT=$(docker run --rm \
    --entrypoint bash \
    -v "$VOL_REPO":/opt/repo:ro \
    -v "$VOL_JOBS":/opt/jobs \
    "$IMAGE" \
    -c "{ cat /opt/repo/calc.py > /dev/null && echo 'READ_OK'; } && \
        { echo 'test' > /opt/repo/hack.py 2>/dev/null && echo 'WRITE_ALLOWED' || echo 'WRITE_BLOCKED'; } && \
        { printf 'verdict: pass\n' > /opt/jobs/artifacts/weaver-review.yaml && echo 'ARTIFACT_OK'; }")

if echo "$WEAVER_RESULT" | grep -q "READ_OK" \
&& echo "$WEAVER_RESULT" | grep -q "WRITE_BLOCKED" \
&& echo "$WEAVER_RESULT" | grep -q "ARTIFACT_OK"; then
    pass "weaver: read repo, write blocked, artifacts writable"
else
    fail "weaver: constraint check failed ($WEAVER_RESULT)"
fi

# 5. Sentinel-midget: same constraints
echo "[5/8] Sentinel-midget: read-only repo, writable artifacts"
SENTINEL_RESULT=$(docker run --rm \
    --entrypoint bash \
    -v "$VOL_REPO":/opt/repo:ro \
    -v "$VOL_JOBS":/opt/jobs \
    "$IMAGE" \
    -c "{ cat /opt/repo/calc.py > /dev/null && echo 'READ_OK'; } && \
        { echo 'test' > /opt/repo/hack.py 2>/dev/null && echo 'WRITE_ALLOWED' || echo 'WRITE_BLOCKED'; } && \
        { printf 'verdict: pass\n' > /opt/jobs/artifacts/sentinel-review.yaml && echo 'ARTIFACT_OK'; }")

if echo "$SENTINEL_RESULT" | grep -q "READ_OK" \
&& echo "$SENTINEL_RESULT" | grep -q "WRITE_BLOCKED" \
&& echo "$SENTINEL_RESULT" | grep -q "ARTIFACT_OK"; then
    pass "sentinel: read repo, write blocked, artifacts writable"
else
    fail "sentinel: constraint check failed ($SENTINEL_RESULT)"
fi

# 6. All crew results collected on jobs volume
echo "[6/8] All crew results on shared volume"
ARTIFACT_LIST=$(docker run --rm --entrypoint bash \
    -v "$VOL_JOBS":/opt/jobs \
    "$IMAGE" \
    -c "ls /opt/jobs/artifacts/*-review.yaml 2>/dev/null | sort")

EXPECTED_COUNT=3
ACTUAL_COUNT=$(echo "$ARTIFACT_LIST" | grep -c "review.yaml" || true)

if [ "$ACTUAL_COUNT" = "$EXPECTED_COUNT" ]; then
    pass "$EXPECTED_COUNT review YAMLs collected (watchdog, weaver, sentinel)"
else
    fail "expected $EXPECTED_COUNT review YAMLs, found $ACTUAL_COUNT"
fi

# 7. Verify diff and source are readable from review containers
echo "[7/8] Diff readable by review containers"
DIFF_CHECK=$(docker run --rm --entrypoint bash \
    -v "$VOL_REPO":/opt/repo:ro \
    -v "$VOL_JOBS":/opt/jobs \
    "$IMAGE" \
    -c "cat /opt/jobs/artifacts/diff.patch | head -1")

if echo "$DIFF_CHECK" | grep -q "dev/null"; then
    pass "diff.patch readable from jobs volume"
else
    fail "diff.patch not readable"
fi

# 8. Verify the infrastructure constraint via docker inspect
echo "[8/8] docker inspect confirms read-only mount"
docker run -d --name "crew-inspect-$$" \
    --entrypoint bash \
    -v "$VOL_REPO":/opt/repo:ro \
    "$IMAGE" \
    -c "sleep 30" >/dev/null 2>&1

MOUNT_RO=$(docker inspect "crew-inspect-$$" \
    --format '{{range .Mounts}}{{if eq .Destination "/opt/repo"}}{{.RW}}{{end}}{{end}}' 2>/dev/null)

docker rm -f "crew-inspect-$$" >/dev/null 2>&1

if [ "$MOUNT_RO" = "false" ]; then
    pass "docker inspect: /opt/repo RW=false (read-only confirmed by infrastructure)"
else
    fail "docker inspect: /opt/repo RW=$MOUNT_RO (expected false)"
fi

echo ""
printf "=== Results: %d passed, %d failed ===\n" "$PASS" "$FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then
    echo "C4 CREW TESTS FAILED"
    exit 1
else
    echo "C4 CREW TESTS PASSED — governance crew plumbing proven"
    echo ""
    echo "What was demonstrated:"
    echo "  - Sample repo with deliberate defect staged on shared volume"
    echo "  - Dev-midget: full write access to repo (infrastructure allows)"
    echo "  - Watchdog/Weaver/Sentinel: read-only repo mount (infrastructure enforces)"
    echo "  - All crew: can write review artifacts to shared volume"
    echo "  - docker inspect confirms RW=false on read-only mounts"
    echo "  - Governance constraint is in the infrastructure, not the prompt"
    echo ""
    echo "Next: make crew (live LLM run with API keys)"
    exit 0
fi
