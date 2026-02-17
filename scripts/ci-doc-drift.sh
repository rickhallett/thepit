#!/usr/bin/env bash
# CI Doc Drift — evaluate which docs may be stale given a PR diff.
# Outputs a markdown summary suitable for posting as a PR comment.
# Uses .claude/data/doc-drift-map.yml as the source of truth.
#
# Usage: scripts/ci-doc-drift.sh [base_ref]
#   base_ref: git ref to diff against (default: origin/master)
#
# Exit codes: 0 always (informational, non-blocking)
set -euo pipefail

BASE_REF="${1:-origin/master}"
DRIFTMAP=".claude/data/doc-drift-map.yml"

if [ ! -f "$DRIFTMAP" ]; then
  echo "doc-drift-map.yml not found, skipping"
  exit 0
fi

# Get changed files
CHANGED_FILES=$(git diff "$BASE_REF"...HEAD --name-only --diff-filter=ACMRD 2>/dev/null || git diff "$BASE_REF" --name-only --diff-filter=ACMRD 2>/dev/null || echo "")

if [ -z "$CHANGED_FILES" ]; then
  echo "No changed files detected."
  exit 0
fi

FILE_COUNT=$(echo "$CHANGED_FILES" | wc -l | tr -d ' ')

match_pattern() {
  local pattern="$1"
  local regex
  regex=$(echo "$pattern" | sed 's/\./\\./g' | sed 's/\*\*/DOUBLESTAR/g' | sed 's/\*/[^\/]*/g' | sed 's/DOUBLESTAR/.*/g')
  echo "$CHANGED_FILES" | grep -qE "^${regex}$" 2>/dev/null
}

# Parse doc-drift-map.yml and match
DRIFT_RESULTS=""
TRIGGER_COUNT=0
STALE_DOCS=""
current_doc=""

while IFS= read -r line; do
  case "$line" in
    *"doc:"*)
      current_doc=$(echo "$line" | sed 's/.*doc: *"//' | sed 's/".*//')
      ;;
    *"pattern:"*)
      pattern=$(echo "$line" | sed 's/.*pattern: *"//' | sed 's/".*//')
      ;;
    *"reason:"*)
      reason=$(echo "$line" | sed 's/.*reason: *"//' | sed 's/".*//')
      if [ -n "$current_doc" ] && [ -n "$pattern" ]; then
        if match_pattern "$pattern"; then
          TRIGGER_COUNT=$((TRIGGER_COUNT + 1))
          DRIFT_RESULTS="${DRIFT_RESULTS}| \`${current_doc}\` | \`${pattern}\` | ${reason} |
"
          # Track unique doc names
          if ! echo "$STALE_DOCS" | grep -qF "$current_doc"; then
            STALE_DOCS="${STALE_DOCS}${current_doc}
"
          fi
        fi
      fi
      ;;
  esac
done < "$DRIFTMAP"

# Count unique stale docs
DOC_COUNT=0
if [ -n "$STALE_DOCS" ]; then
  DOC_COUNT=$(echo -n "$STALE_DOCS" | grep -c . 2>/dev/null || echo 0)
fi

# Output markdown report
echo "## Doc Drift Report"
echo ""
echo "**Diff:** \`${BASE_REF}...HEAD\` | **Files changed:** ${FILE_COUNT} | **Docs potentially stale:** ${DOC_COUNT} | **Triggers matched:** ${TRIGGER_COUNT}"
echo ""

if [ "$DOC_COUNT" -eq 0 ]; then
  echo "No documentation drift detected. Diff is isolated from documented claims."
  exit 0
fi

echo "| Document | Trigger | Reason |"
echo "|----------|---------|--------|"
echo -n "$DRIFT_RESULTS"
echo ""

echo "> **Recommendation:** Run \`/doc-audit\` scoped to the flagged documents to verify and fix staleness."
