#!/usr/bin/env bash
# CI Trigger Scan — evaluate self-healing triggers against a PR diff.
# Outputs a markdown summary suitable for posting as a PR comment.
# Uses .claude/data/trigger-manifest.yml as the source of truth.
#
# Usage: scripts/ci-trigger-scan.sh [base_ref]
#   base_ref: git ref to diff against (default: origin/master)
#
# Exit codes: 0 always (informational, non-blocking)
set -euo pipefail

BASE_REF="${1:-origin/master}"
MANIFEST=".claude/data/trigger-manifest.yml"

if [ ! -f "$MANIFEST" ]; then
  echo "trigger-manifest.yml not found, skipping"
  exit 0
fi

# Get changed files
CHANGED_FILES=$(git diff "$BASE_REF"...HEAD --name-only --diff-filter=ACMRD 2>/dev/null || git diff "$BASE_REF" --name-only --diff-filter=ACMRD 2>/dev/null || echo "")

if [ -z "$CHANGED_FILES" ]; then
  echo "No changed files detected."
  exit 0
fi

FILE_COUNT=$(echo "$CHANGED_FILES" | wc -l | tr -d ' ')

# Parse triggers and match against changed files.
FIRED_TRIGGERS=""
FIRED_COUNT=0
AGENTS_INVOLVED=""

# Per-trigger state
current_agent=""
current_id=""
current_condition=""
current_patterns=""
# Saved agent for the trigger being accumulated (set when id: is parsed)
emit_agent=""

match_pattern() {
  local pattern="$1"
  # Convert glob pattern to grep-compatible regex.
  # Handle ** (match any path depth, including zero segments) before * (single segment).
  local regex
  regex=$(echo "$pattern" | sed 's/\./\\./g' | sed 's/\*\*/DOUBLESTAR/g' | sed 's/\*/[^\/]*/g' | sed 's/DOUBLESTAR/.*/g')
  echo "$CHANGED_FILES" | grep -qE "^${regex}$" 2>/dev/null
}

check_and_emit() {
  if [ -z "$current_id" ] || [ -z "$current_patterns" ]; then
    return
  fi

  local matched=false
  local matched_file=""

  # Split patterns by comma/space and check each
  local patterns
  patterns=$(echo "$current_patterns" | tr -d '[]"' | tr ',' '\n' | sed 's/^ *//' | sed 's/ *$//')

  while IFS= read -r pat; do
    [ -z "$pat" ] && continue
    if match_pattern "$pat"; then
      matched=true
      matched_file=$(echo "$CHANGED_FILES" | grep -m1 -E "$(echo "$pat" | sed 's/\./\\./g' | sed 's/\*\*/DOUBLESTAR/g' | sed 's/\*/[^\/]*/g' | sed 's/DOUBLESTAR/.*/g')" 2>/dev/null || echo "$pat")
      break
    fi
  done <<< "$patterns"

  if [ "$matched" = true ]; then
    FIRED_COUNT=$((FIRED_COUNT + 1))
    FIRED_TRIGGERS="${FIRED_TRIGGERS}| \`${current_id}\` | ${emit_agent} | ${current_condition} | \`${matched_file}\` |
"
    if ! echo "$AGENTS_INVOLVED" | grep -q "$emit_agent"; then
      AGENTS_INVOLVED="${AGENTS_INVOLVED} ${emit_agent}"
    fi
  fi
}

while IFS= read -r line; do
  case "$line" in
    *"agent:"*)
      current_agent=$(echo "$line" | sed 's/.*agent: *//')
      ;;
    *"id:"*)
      # Emit previous trigger (uses emit_agent, not current_agent)
      check_and_emit
      # Now start accumulating the new trigger
      current_id=$(echo "$line" | sed 's/.*id: *//')
      current_condition=""
      current_patterns=""
      # Snapshot the agent for this trigger BEFORE it can be overwritten
      emit_agent="$current_agent"
      ;;
    *"condition:"*)
      current_condition=$(echo "$line" | sed 's/.*condition: *//')
      ;;
    *"file_patterns:"*)
      current_patterns=$(echo "$line" | sed 's/.*file_patterns: *//')
      ;;
  esac
done < "$MANIFEST"

# Check the last trigger
check_and_emit

# Output markdown report
echo "## Trigger Scan Report"
echo ""
echo "**Diff:** \`${BASE_REF}...HEAD\` | **Files changed:** ${FILE_COUNT} | **Triggers fired:** ${FIRED_COUNT} / 51"
echo ""

if [ "$FIRED_COUNT" -eq 0 ]; then
  echo "No triggers fired. Diff is isolated from all monitored patterns."
  exit 0
fi

echo "**Agents involved:**${AGENTS_INVOLVED}"
echo ""
echo "| Trigger | Agent | Condition | Matched File |"
echo "|---------|-------|-----------|-------------|"
echo -n "$FIRED_TRIGGERS"
echo ""

if [ "$FIRED_COUNT" -gt 10 ]; then
  echo "> **Warning:** ${FIRED_COUNT} triggers fired. This is a large structural change. Consider running \`/security-audit\` and \`/doc-audit\`."
fi
