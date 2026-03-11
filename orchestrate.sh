#!/bin/bash
# Midget C4 — live crew orchestrator.
# Runs on the HOST. Dispatches LLM agents inside containers with
# role-specific mount constraints. Requires ANTHROPIC_API_KEY.
#
# Flow:
#   1. Stage sample repo with deliberate defect + diff
#   2. Watchdog-midget: review diff, write tests, report verdict
#   3. Weaver-midget: review diff, analyse quality, report verdict
#   4. Sentinel-midget: review diff, scan for security, report verdict
#   5. Orchestrator: collect all reviews, print triangulated verdict
#
# Usage: make crew
#        ANTHROPIC_API_KEY must be set.

set -e

IMAGE="midget-poc"
VOL_REPO="crew-live-repo-$$"
VOL_JOBS="crew-live-jobs-$$"
CREW_DIR="$(cd "$(dirname "$0")" && pwd)/crew"
RUN_ID="crew-live-$(date +%Y-%m-%d-%H%M%S)"
ARTIFACT_DIR="data/alley/$RUN_ID"

for KEY_NAME in GEMINI_API_KEY XAI_API_KEY OPENAI_API_KEY; do
    if [ -z "${!KEY_NAME}" ]; then
        echo "ERROR: $KEY_NAME not set (required for cross-model crew)" >&2
        exit 1
    fi
done

cleanup() {
    docker volume rm "$VOL_REPO" "$VOL_JOBS" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo ""
echo "=== Live Crew Orchestration ==="
echo ""

# 1. Create volumes + stage defective repo
echo "--- Stage ---"
docker volume create "$VOL_REPO" >/dev/null 2>&1
docker volume create "$VOL_JOBS" >/dev/null 2>&1

docker run --rm --entrypoint bash -u root \
    -v "$VOL_REPO":/opt/repo \
    -v "$VOL_JOBS":/opt/jobs \
    "$IMAGE" \
    -c "mkdir -p /opt/jobs/artifacts /opt/jobs/incoming /opt/jobs/done && \
        chown -R 1000:1000 /opt/repo /opt/jobs"

# Sample utility module. Three functions are correct. One has a silent bug:
# weighted_score uses zip(), which silently truncates mismatched-length inputs.
# No crash, no error, just a wrong answer. The kind of thing that passes review.
docker run --rm -i --entrypoint bash \
    -v "$VOL_REPO":/opt/repo \
    "$IMAGE" \
    -c "cat > /opt/repo/calc.py" << 'PYEOF'
def average(numbers):
    """Return the arithmetic mean of a list of numbers."""
    if not numbers:
        raise ValueError("cannot average empty list")
    return sum(numbers) / len(numbers)


def clamp(value, low, high):
    """Clamp value to the range [low, high]."""
    return max(low, min(value, high))


def weighted_score(scores, weights):
    """Compute weighted score, normalized by total weight."""
    total_weight = sum(weights)
    return sum(s * w for s, w in zip(scores, weights)) / total_weight


def letter_grade(score):
    """Convert numeric score (0-100) to letter grade."""
    if score >= 90:
        return 'A'
    elif score >= 80:
        return 'B'
    elif score >= 70:
        return 'C'
    elif score >= 60:
        return 'D'
    return 'F'
PYEOF

docker run --rm -i --entrypoint bash \
    -v "$VOL_JOBS":/opt/jobs \
    "$IMAGE" \
    -c "cat > /opt/jobs/artifacts/diff.patch" << 'DIFFEOF'
--- /dev/null
+++ b/calc.py
@@ -0,0 +1,28 @@
+def average(numbers):
+    """Return the arithmetic mean of a list of numbers."""
+    if not numbers:
+        raise ValueError("cannot average empty list")
+    return sum(numbers) / len(numbers)
+
+
+def clamp(value, low, high):
+    """Clamp value to the range [low, high]."""
+    return max(low, min(value, high))
+
+
+def weighted_score(scores, weights):
+    """Compute weighted score, normalized by total weight."""
+    total_weight = sum(weights)
+    return sum(s * w for s, w in zip(scores, weights)) / total_weight
+
+
+def letter_grade(score):
+    """Convert numeric score (0-100) to letter grade."""
+    if score >= 90:
+        return 'A'
+    elif score >= 80:
+        return 'B'
+    elif score >= 70:
+        return 'C'
+    elif score >= 60:
+        return 'D'
+    return 'F'
DIFFEOF

echo "  repo + diff staged"

# Helper: stage prompt and source into jobs volume, return assembled prompt text
stage_prompt() {
    local ROLE=$1
    local PROMPT_FILE=$2

    docker run --rm -i --entrypoint bash \
        -v "$VOL_JOBS":/opt/jobs \
        "$IMAGE" \
        -c "cat > /opt/jobs/artifacts/${ROLE}-prompt.md" < "$PROMPT_FILE"
}

# Run a crew member via Gemini CLI (inside container)
run_gemini() {
    local ROLE=$1
    local PROMPT_FILE=$2

    echo ""
    echo "--- $ROLE (gemini-2.5-flash) ---"
    stage_prompt "$ROLE" "$PROMPT_FILE"

    docker run --rm \
        -v "$VOL_REPO:/opt/repo:ro" \
        -v "$VOL_JOBS":/opt/jobs \
        -e GEMINI_API_KEY="$GEMINI_API_KEY" \
        -e MIDGET_JOBS_DIR=/opt/jobs \
        "$IMAGE" \
        bash -c "gemini -p \"\$(cat /opt/jobs/artifacts/${ROLE}-prompt.md)

Here is the diff to review:

\$(cat /opt/jobs/artifacts/diff.patch)

Here is the source file:

\$(cat /opt/repo/calc.py)

Write your YAML review to /opt/jobs/artifacts/${ROLE}-review.yaml\" \
            -m gemini-2.5-flash \
            --approval-mode yolo \
            --output-format json \
            > /opt/jobs/artifacts/${ROLE}-trace.json \
            2>/opt/jobs/artifacts/${ROLE}-stderr.log"

    echo "  $ROLE complete"
}

# Run a crew member via Grok API (curl inside container, OpenAI-compatible)
run_grok() {
    local ROLE=$1
    local PROMPT_FILE=$2

    echo ""
    echo "--- $ROLE (grok-3-mini-fast) ---"
    stage_prompt "$ROLE" "$PROMPT_FILE"

    # Build the full prompt, then call xAI API via curl inside the container.
    # Grok has no agentic CLI, so it produces the review YAML directly in its response.
    # We ask it to output ONLY the YAML content.
    # Full API response preserved as trace for audit.
    docker run --rm \
        -v "$VOL_REPO:/opt/repo:ro" \
        -v "$VOL_JOBS":/opt/jobs \
        -e XAI_API_KEY="$XAI_API_KEY" \
        -e MIDGET_JOBS_DIR=/opt/jobs \
        "$IMAGE" \
        bash -c '
ROLE_PROMPT=$(cat /opt/jobs/artifacts/'"$ROLE"'-prompt.md)
DIFF=$(cat /opt/jobs/artifacts/diff.patch)
SOURCE=$(cat /opt/repo/calc.py)

FULL_PROMPT="$ROLE_PROMPT

Here is the diff to review:

$DIFF

Here is the source file:

$SOURCE

Output ONLY valid YAML for your review. No markdown fences, no explanation outside the YAML."

# Escape for JSON
JSON_PROMPT=$(python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))" <<< "$FULL_PROMPT")

RESPONSE=$(curl -s https://api.x.ai/v1/chat/completions \
    -H "Authorization: Bearer $XAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"grok-3-mini-fast\",\"messages\":[{\"role\":\"user\",\"content\":$JSON_PROMPT}],\"max_tokens\":4096}")

# Save full API response as trace
echo "$RESPONSE" > /opt/jobs/artifacts/'"$ROLE"'-trace.json

# Extract content from response and write review
echo "$RESPONSE" | python3 -c "
import json, sys
r = json.load(sys.stdin)
content = r[\"choices\"][0][\"message\"][\"content\"]
# Strip markdown fences if present
lines = content.strip().split(chr(10))
if lines[0].startswith(\"\`\`\`\"):
    lines = lines[1:]
if lines[-1].startswith(\"\`\`\`\"):
    lines = lines[:-1]
print(chr(10).join(lines))
" > /opt/jobs/artifacts/'"$ROLE"'-review.yaml
'

    echo "  $ROLE complete"
}

# Run a crew member via Codex CLI (inside container)
run_codex() {
    local ROLE=$1
    local PROMPT_FILE=$2

    echo ""
    echo "--- $ROLE (gpt-4.1-mini) ---"
    stage_prompt "$ROLE" "$PROMPT_FILE"

    docker run --rm \
        -v "$VOL_REPO:/opt/repo:ro" \
        -v "$VOL_JOBS":/opt/jobs \
        -e OPENAI_API_KEY="$OPENAI_API_KEY" \
        -e MIDGET_JOBS_DIR=/opt/jobs \
        "$IMAGE" \
        bash -c "codex exec -m gpt-4.1-mini \
            --dangerously-bypass-approvals-and-sandbox \
            --skip-git-repo-check \
            --json \
            \"\$(cat /opt/jobs/artifacts/${ROLE}-prompt.md)

Here is the diff to review:

\$(cat /opt/jobs/artifacts/diff.patch)

Here is the source file:

\$(cat /opt/repo/calc.py)

Write your YAML review to /opt/jobs/artifacts/${ROLE}-review.yaml\" \
            > /opt/jobs/artifacts/${ROLE}-trace.jsonl \
            2>/opt/jobs/artifacts/${ROLE}-stderr.log"

    echo "  $ROLE complete"
}

# 2-4. Run crew members sequentially - three different models, none is Claude
# Claude wrote the code under review; using it as reviewer is a confound.
run_gemini "watchdog" "$CREW_DIR/watchdog.md"
run_grok   "weaver"   "$CREW_DIR/weaver.md"
run_codex  "sentinel" "$CREW_DIR/sentinel.md"

# 5. Collect and display results
echo ""
echo "--- Triangulation ---"
echo ""

for ROLE in watchdog weaver sentinel; do
    echo "=== $ROLE ==="
    docker run --rm --entrypoint bash \
        -v "$VOL_JOBS":/opt/jobs \
        "$IMAGE" \
        -c "cat /opt/jobs/artifacts/${ROLE}-review.yaml 2>/dev/null || echo 'NO REVIEW FOUND'"
    echo ""
done

# Count verdicts
PASS_COUNT=0
FAIL_COUNT=0
MISSING_COUNT=0

for ROLE in watchdog weaver sentinel; do
    VERDICT=$(docker run --rm --entrypoint bash \
        -v "$VOL_JOBS":/opt/jobs \
        "$IMAGE" \
        -c "grep 'verdict:' /opt/jobs/artifacts/${ROLE}-review.yaml 2>/dev/null | head -1 | awk '{print \$2}'" 2>/dev/null)
    case "$VERDICT" in
        pass) PASS_COUNT=$((PASS_COUNT + 1)) ;;
        fail) FAIL_COUNT=$((FAIL_COUNT + 1)) ;;
        *) MISSING_COUNT=$((MISSING_COUNT + 1)) ;;
    esac
done

echo "=== Verdict ==="
echo "  pass: $PASS_COUNT  fail: $FAIL_COUNT  missing: $MISSING_COUNT"

if [ "$FAIL_COUNT" -gt 0 ]; then
    echo "  TRIANGULATED VERDICT: FAIL (defect detected by crew)"
elif [ "$MISSING_COUNT" -gt 0 ]; then
    echo "  TRIANGULATED VERDICT: INCOMPLETE ($MISSING_COUNT reviews missing)"
else
    echo "  TRIANGULATED VERDICT: PASS"
fi

# 6. Persist artifacts to local filesystem before cleanup destroys volumes
echo ""
echo "--- Persist ---"
mkdir -p "$ARTIFACT_DIR"

docker run --rm --entrypoint bash \
    -v "$VOL_JOBS":/opt/jobs \
    "$IMAGE" \
    -c "tar cf - -C /opt/jobs/artifacts ." | tar xf - -C "$ARTIFACT_DIR"

# Copy the injected source for provenance
docker run --rm --entrypoint bash \
    -v "$VOL_REPO":/opt/repo \
    "$IMAGE" \
    -c "cat /opt/repo/calc.py" > "$ARTIFACT_DIR/calc.py"

# Write run metadata
cat > "$ARTIFACT_DIR/run-metadata.yaml" << METAEOF
run_id: $RUN_ID
date: $(date -Iseconds)
image: $IMAGE
injected_defect: "zip truncation in weighted_score(): silently drops scores when len(scores) != len(weights). No crash, wrong answer."
crew_members:
  - role: watchdog
    model: gemini-2.5-flash
    provider: google
    trace: watchdog-trace.json
    stderr: watchdog-stderr.log
  - role: weaver
    model: grok-3-mini-fast
    provider: xai
    trace: weaver-trace.json
  - role: sentinel
    model: gpt-4.1-mini
    provider: openai
    trace: sentinel-trace.jsonl
    stderr: sentinel-stderr.log
note: "Claude excluded from crew - it wrote the code under review"
audit: "Full action traces preserved per agent. Gemini/Codex: structured JSON with tool calls. Grok: raw API response."
verdict:
  pass: $PASS_COUNT
  fail: $FAIL_COUNT
  missing: $MISSING_COUNT
  triangulated: $(if [ "$FAIL_COUNT" -gt 0 ]; then echo "FAIL"; elif [ "$MISSING_COUNT" -gt 0 ]; then echo "INCOMPLETE"; else echo "PASS"; fi)
METAEOF

echo "  artifacts saved to $ARTIFACT_DIR/"
ls -1 "$ARTIFACT_DIR/"
echo ""
