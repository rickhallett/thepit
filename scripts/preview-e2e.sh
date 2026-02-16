#!/usr/bin/env bash
# preview-e2e.sh — Push, wait for Vercel preview deployment, run Playwright.
#
# Usage:
#   ./scripts/preview-e2e.sh           # push + wait + run e2e
#   ./scripts/preview-e2e.sh --url     # push + wait + print URL only (no e2e)
#   ./scripts/preview-e2e.sh --skip-push  # don't push, just wait for latest
#
# Safety:
#   - NEVER modifies Vercel env vars on Production
#   - Bails if current branch is master/main (production)
#   - Only queries Preview deployments
#
# Requirements:
#   - gh (GitHub CLI, authenticated)
#   - git
#   - pnpm (for Playwright)

set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
REPO="rickhallett/thepit"
POLL_INTERVAL=10   # seconds between polls
MAX_WAIT=300       # 5 minutes max wait
URL_ONLY=false
SKIP_PUSH=false

# ---------------------------------------------------------------------------
# Parse flags
# ---------------------------------------------------------------------------
for arg in "$@"; do
  case "$arg" in
    --url)       URL_ONLY=true ;;
    --skip-push) SKIP_PUSH=true ;;
    --help|-h)
      sed -n '2,/^$/p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "Unknown flag: $arg" >&2
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Safety: refuse to run on production branches
# ---------------------------------------------------------------------------
BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [[ "$BRANCH" == "master" || "$BRANCH" == "main" || "$BRANCH" == "production" ]]; then
  echo "FATAL: Refusing to run on production branch '$BRANCH'." >&2
  echo "This script is for preview deployments only." >&2
  exit 1
fi

echo "Branch: $BRANCH"

# ---------------------------------------------------------------------------
# Push (unless --skip-push)
# ---------------------------------------------------------------------------
if [[ "$SKIP_PUSH" == false ]]; then
  # Check if there are commits to push
  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "none")

  if [[ "$LOCAL" == "$REMOTE" ]]; then
    echo "Already up to date with origin/$BRANCH."
  else
    echo "Pushing to origin/$BRANCH..."
    git push -u origin "$BRANCH"
  fi
fi

HEAD_SHA=$(git rev-parse HEAD)
SHORT_SHA=${HEAD_SHA:0:8}
echo "Waiting for Preview deployment of $SHORT_SHA..."

# ---------------------------------------------------------------------------
# Poll for deployment
# ---------------------------------------------------------------------------
ELAPSED=0
DEPLOY_URL=""

while [[ $ELAPSED -lt $MAX_WAIT ]]; do
  # Query GitHub Deployments API for this SHA in Preview environment
  RESULT=$(gh api "repos/$REPO/deployments?sha=$HEAD_SHA&environment=Preview" \
    --jq '.[0].id // empty' 2>/dev/null || true)

  if [[ -n "$RESULT" ]]; then
    DEPLOY_ID="$RESULT"

    # Check deployment status
    STATUS_JSON=$(gh api "repos/$REPO/deployments/$DEPLOY_ID/statuses" \
      --jq '.[0] | {state: .state, url: (.target_url // .environment_url)}' 2>/dev/null || true)

    STATE=$(echo "$STATUS_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('state',''))" 2>/dev/null || true)
    TARGET_URL=$(echo "$STATUS_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('url',''))" 2>/dev/null || true)

    # Safety: verify this is NOT a production deployment
    DEPLOY_ENV=$(gh api "repos/$REPO/deployments/$DEPLOY_ID" \
      --jq '.environment' 2>/dev/null || true)

    if [[ "$DEPLOY_ENV" == "Production" || "$DEPLOY_ENV" == "production" ]]; then
      echo "FATAL: Matched a Production deployment. This should never happen." >&2
      echo "Deployment ID: $DEPLOY_ID, Environment: $DEPLOY_ENV" >&2
      echo "Bailing out to protect production." >&2
      exit 1
    fi

    case "$STATE" in
      success)
        DEPLOY_URL="$TARGET_URL"
        break
        ;;
      failure|error)
        echo "Deployment FAILED (state=$STATE)." >&2
        echo "Check: https://github.com/$REPO/deployments" >&2
        exit 1
        ;;
      *)
        # pending, in_progress, queued, etc.
        printf "\r  Status: %-12s  Elapsed: %ds / %ds" "$STATE" "$ELAPSED" "$MAX_WAIT"
        ;;
    esac
  else
    printf "\r  Waiting for deployment...  Elapsed: %ds / %ds" "$ELAPSED" "$MAX_WAIT"
  fi

  sleep "$POLL_INTERVAL"
  ELAPSED=$((ELAPSED + POLL_INTERVAL))
done

echo ""

if [[ -z "$DEPLOY_URL" ]]; then
  echo "Timed out after ${MAX_WAIT}s waiting for Preview deployment." >&2
  echo "Check: https://github.com/$REPO/deployments" >&2
  exit 1
fi

echo "Preview deployed: $DEPLOY_URL"

# ---------------------------------------------------------------------------
# URL-only mode: just print and exit
# ---------------------------------------------------------------------------
if [[ "$URL_ONLY" == true ]]; then
  echo "$DEPLOY_URL"
  exit 0
fi

# ---------------------------------------------------------------------------
# Run Playwright against the preview
# ---------------------------------------------------------------------------
echo ""
echo "Running Playwright against preview..."
echo "  BASE_URL=$DEPLOY_URL"
echo ""

BASE_URL="$DEPLOY_URL" pnpm exec playwright test
