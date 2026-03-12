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
MIDGET_CPUS="${MIDGET_CPUS:-2}"
MIDGET_MEMORY="${MIDGET_MEMORY:-4g}"
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
        --cpus "$MIDGET_CPUS" --memory "$MIDGET_MEMORY" \
        --label midget=true \
        --label midget.role="$ROLE" \
        --label midget.run="$RUN_ID" \
        -v "$VOL_REPO:/opt/repo:ro" \
        -v "$VOL_JOBS":/opt/jobs \
        -e GEMINI_API_KEY="$GEMINI_API_KEY" \
        -e MIDGET_JOBS_DIR=/opt/jobs \
        -e MIDGET_ROLE="$ROLE" \
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
        --cpus "$MIDGET_CPUS" --memory "$MIDGET_MEMORY" \
        --label midget=true \
        --label midget.role="$ROLE" \
        --label midget.run="$RUN_ID" \
        -v "$VOL_REPO:/opt/repo:ro" \
        -v "$VOL_JOBS":/opt/jobs \
        -e XAI_API_KEY="$XAI_API_KEY" \
        -e MIDGET_JOBS_DIR=/opt/jobs \
        -e MIDGET_ROLE="$ROLE" \
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
        --cpus "$MIDGET_CPUS" --memory "$MIDGET_MEMORY" \
        --label midget=true \
        --label midget.role="$ROLE" \
        --label midget.run="$RUN_ID" \
        -v "$VOL_REPO:/opt/repo:ro" \
        -v "$VOL_JOBS":/opt/jobs \
        -e OPENAI_API_KEY="$OPENAI_API_KEY" \
        -e MIDGET_JOBS_DIR=/opt/jobs \
        -e MIDGET_ROLE="$ROLE" \
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

# 7. Extract token usage from traces
echo ""
echo "--- Token Usage ---"

python3 - "$ARTIFACT_DIR" << 'TOKENEOF'
import json, sys, os, glob

artifact_dir = sys.argv[1]
usage = {}

# Gemini: .stats.models.*.tokens in single JSON
for f in glob.glob(os.path.join(artifact_dir, "*-trace.json")):
    role = os.path.basename(f).replace("-trace.json", "")
    try:
        with open(f) as fh:
            data = json.load(fh)
        # Gemini format: .stats.models.<model>.tokens
        stats = data.get("stats", {}).get("models", {})
        for model_name, model_data in stats.items():
            tokens = model_data.get("tokens", {})
            usage[role] = {
                "model": model_name,
                "input_tokens": tokens.get("input", 0),
                "output_tokens": tokens.get("candidates", 0),
                "thinking_tokens": tokens.get("thoughts", 0),
                "cached_tokens": tokens.get("cached", 0),
                "total_tokens": tokens.get("total", 0),
            }
            break
        if role in usage:
            continue
        # xAI/OpenAI format: .usage at top level
        u = data.get("usage", {})
        if u:
            usage[role] = {
                "model": data.get("model", "unknown"),
                "input_tokens": u.get("prompt_tokens", 0),
                "output_tokens": u.get("completion_tokens", 0),
                "thinking_tokens": u.get("completion_tokens_details", {}).get("reasoning_tokens", 0),
                "cached_tokens": u.get("prompt_tokens_details", {}).get("cached_tokens", 0),
                "total_tokens": u.get("total_tokens", 0),
            }
            cost_ticks = u.get("cost_in_usd_ticks")
            if cost_ticks is not None:
                usage[role]["cost_usd"] = cost_ticks / 1_000_000
    except Exception as e:
        print(f"  {role}: trace parse error: {e}", file=sys.stderr)

# Codex: JSONL, sum usage from turn.completed events
for f in glob.glob(os.path.join(artifact_dir, "*-trace.jsonl")):
    role = os.path.basename(f).replace("-trace.jsonl", "")
    input_t = 0
    output_t = 0
    cached_t = 0
    try:
        with open(f) as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                evt = json.loads(line)
                if evt.get("type") == "turn.completed":
                    u = evt.get("usage", {})
                    input_t += u.get("input_tokens", 0)
                    output_t += u.get("output_tokens", 0)
                    cached_t += u.get("cached_input_tokens", 0)
        if input_t or output_t:
            usage[role] = {
                "model": "codex-default",
                "input_tokens": input_t,
                "output_tokens": output_t,
                "cached_tokens": cached_t,
                "total_tokens": input_t + output_t,
            }
    except Exception as e:
        print(f"  {role}: trace parse error: {e}", file=sys.stderr)

# Print summary
total_all = 0
for role in sorted(usage.keys()):
    u = usage[role]
    total_all += u.get("total_tokens", 0)
    cost_str = ""
    if "cost_usd" in u:
        cost_str = f"  cost=${u['cost_usd']:.4f}"
    print(f"  {role} ({u['model']}): in={u['input_tokens']} out={u['output_tokens']} total={u['total_tokens']}{cost_str}")
print(f"  ---")
print(f"  total tokens: {total_all}")

# Write usage YAML
usage_path = os.path.join(artifact_dir, "token-usage.yaml")
with open(usage_path, "w") as fh:
    fh.write("# Token usage per crew member\n")
    for role in sorted(usage.keys()):
        u = usage[role]
        fh.write(f"{role}:\n")
        for k, v in u.items():
            fh.write(f"  {k}: {v}\n")
    fh.write(f"total_tokens: {total_all}\n")

if not usage:
    print("  no traces found (run predates trace capture?)")
TOKENEOF

echo "  artifacts saved to $ARTIFACT_DIR/"
ls -1 "$ARTIFACT_DIR/"
echo ""
