#!/bin/bash
# Midget C2 — inter-container communication test suite.
# Runs on the HOST. Orchestrates two midget containers sharing a Docker volume.
#
# Proves:
#   1. Docker named volume created cleanly
#   2. Job-A written to incoming/ via helper container
#   3. midget-A (producer) processes job-A, writes artifact to shared volume
#   4. Job-A result YAML: exit=0, verdict=pass, output contains payload
#   5. Artifact file present on shared volume after midget-A exits
#   6. Job-B written to incoming/ via helper container
#   7. midget-B (consumer) processes job-B, reads artifact from shared volume
#   8. Job-B result YAML: exit=0, verdict=pass, output contains payload
#      Convergence: job-A output == job-B output (same artifact, two containers)

set -e

PASS=0
FAIL=0
IMAGE="midget-poc"
VOLUME="midget-shared-$$"

pass() { PASS=$((PASS + 1)); printf "  PASS: %s\n" "$1"; }
fail() { FAIL=$((FAIL + 1)); printf "  FAIL: %s\n" "$1" >&2; }

cleanup() {
    docker volume rm "$VOLUME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "=== C2 Inter-Container Communication Test Suite ==="
echo "  volume: $VOLUME"
echo ""

# 1. Create shared volume + init dirs with correct ownership
echo "[1/8] Create shared volume"
if docker volume create "$VOLUME" >/dev/null 2>&1; then
    pass "volume created: $VOLUME"
else
    fail "volume create failed"
    exit 1
fi

# Named volumes mount with root ownership. Init dirs and chown to agent (uid 1000)
# before the agent user tries to write to them.
docker run --rm \
    --entrypoint bash \
    -u root \
    -v "$VOLUME":/opt/jobs \
    "$IMAGE" \
    -c "mkdir -p /opt/jobs/incoming /opt/jobs/done /opt/jobs/artifacts && chown -R 1000:1000 /opt/jobs"

# 2. Write job-A to incoming/ on the shared volume
echo "[2/8] Write job-A (producer) to incoming/"
docker run --rm -i \
    --entrypoint bash \
    -v "$VOLUME":/opt/jobs \
    "$IMAGE" \
    -c "mkdir -p /opt/jobs/incoming /opt/jobs/done /opt/jobs/artifacts && cat > /opt/jobs/incoming/c2-alpha-001.yaml" \
    << 'JOB_A_EOF'
job_id: c2-alpha-001
created: 2026-01-01T00:00:00Z
role: producer
task: shell_command
context:
  cmd: "mkdir -p /opt/jobs/artifacts && printf 'ARTIFACT_PAYLOAD_C2\n' > /opt/jobs/artifacts/alpha.txt && cat /opt/jobs/artifacts/alpha.txt"
timeout: 30
JOB_A_EOF
pass "job-A written to incoming/"

# 3. Run midget-A: process job-A (writes artifact + result to shared volume)
echo "[3/8] Run midget-A (producer) — process job-A"
docker run --rm \
    --entrypoint /opt/steer/jobrunner \
    -v "$VOLUME":/opt/jobs \
    -e MIDGET_JOBS_DIR=/opt/jobs \
    "$IMAGE" \
    once >/dev/null 2>&1
pass "midget-A exited"

# 4. Verify job-A result YAML
echo "[4/8] Verify job-A result"
RESULT_A=$(docker run --rm \
    --entrypoint bash \
    -v "$VOLUME":/opt/jobs \
    "$IMAGE" \
    -c "cat /opt/jobs/done/c2-alpha-001.yaml 2>/dev/null || printf 'NOT_FOUND\n'")

if echo "$RESULT_A" | grep -q "NOT_FOUND"; then
    fail "job-A result YAML not found in done/"
else
    if echo "$RESULT_A" | grep -q "exit_code: 0" \
    && echo "$RESULT_A" | grep -q "verdict: pass" \
    && echo "$RESULT_A" | grep -q "ARTIFACT_PAYLOAD_C2"; then
        pass "job-A: exit=0, verdict=pass, output contains payload"
    else
        EXIT_A=$(echo "$RESULT_A" | grep "exit_code:" | awk '{print $2}')
        VERDICT_A=$(echo "$RESULT_A" | grep "verdict:" | awk '{print $2}')
        fail "job-A: exit=$EXIT_A verdict=$VERDICT_A — expected exit=0 pass with payload"
    fi
fi

# 5. Verify artifact file present on shared volume
echo "[5/8] Verify artifact file on shared volume"
ARTIFACT=$(docker run --rm \
    --entrypoint bash \
    -v "$VOLUME":/opt/jobs \
    "$IMAGE" \
    -c "cat /opt/jobs/artifacts/alpha.txt 2>/dev/null || printf 'NOT_FOUND\n'")

if echo "$ARTIFACT" | grep -q "ARTIFACT_PAYLOAD_C2"; then
    pass "artifact present on shared volume: $(echo "$ARTIFACT" | tr -d '\n')"
else
    fail "artifact missing or wrong content: $ARTIFACT"
fi

# 6. Write job-B to incoming/ on the shared volume
echo "[6/8] Write job-B (consumer) to incoming/"
docker run --rm -i \
    --entrypoint bash \
    -v "$VOLUME":/opt/jobs \
    "$IMAGE" \
    -c "cat > /opt/jobs/incoming/c2-beta-001.yaml" \
    << 'JOB_B_EOF'
job_id: c2-beta-001
created: 2026-01-01T00:00:00Z
role: consumer
task: shell_command
context:
  cmd: "cat /opt/jobs/artifacts/alpha.txt"
timeout: 30
JOB_B_EOF
pass "job-B written to incoming/"

# 7. Run midget-B: process job-B (reads artifact from shared volume)
echo "[7/8] Run midget-B (consumer) — process job-B"
docker run --rm \
    --entrypoint /opt/steer/jobrunner \
    -v "$VOLUME":/opt/jobs \
    -e MIDGET_JOBS_DIR=/opt/jobs \
    "$IMAGE" \
    once >/dev/null 2>&1
pass "midget-B exited"

# 8. Verify job-B result + convergence
echo "[8/8] Verify job-B result and convergence"
RESULT_B=$(docker run --rm \
    --entrypoint bash \
    -v "$VOLUME":/opt/jobs \
    "$IMAGE" \
    -c "cat /opt/jobs/done/c2-beta-001.yaml 2>/dev/null || printf 'NOT_FOUND\n'")

if echo "$RESULT_B" | grep -q "NOT_FOUND"; then
    fail "job-B result YAML not found in done/"
else
    if echo "$RESULT_B" | grep -q "exit_code: 0" \
    && echo "$RESULT_B" | grep -q "verdict: pass" \
    && echo "$RESULT_B" | grep -q "ARTIFACT_PAYLOAD_C2"; then
        pass "job-B: exit=0, verdict=pass, output contains payload"
        # Convergence: both outputs carry the same payload string
        PAYLOAD_A=$(echo "$RESULT_A" | grep "ARTIFACT_PAYLOAD_C2" | head -1)
        PAYLOAD_B=$(echo "$RESULT_B" | grep "ARTIFACT_PAYLOAD_C2" | head -1)
        if [ "$PAYLOAD_A" = "$PAYLOAD_B" ] && [ -n "$PAYLOAD_A" ]; then
            pass "convergence: job-A output == job-B output (same artifact, different containers)"
        else
            fail "divergence: payload strings differ between A and B"
        fi
    else
        EXIT_B=$(echo "$RESULT_B" | grep "exit_code:" | awk '{print $2}')
        VERDICT_B=$(echo "$RESULT_B" | grep "verdict:" | awk '{print $2}')
        fail "job-B: exit=$EXIT_B verdict=$VERDICT_B — expected exit=0 pass with payload"
    fi
fi

echo ""
printf "=== Results: %d passed, %d failed ===\n" "$PASS" "$FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then
    echo "C2 INTEROP TESTS FAILED"
    exit 1
else
    echo "C2 INTEROP TESTS PASSED — inter-container handoff proven"
    echo ""
    echo "What was demonstrated:"
    echo "  - Docker named volume shared between two independent containers"
    echo "  - midget-A (producer): executed job, wrote artifact to shared volume"
    echo "  - midget-B (consumer): executed job, read artifact from shared volume"
    echo "  - Convergence: both containers produced the same artifact content"
    echo "  - File-based job protocol sufficient for inter-container coordination"
    exit 0
fi
