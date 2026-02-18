#!/usr/bin/env bash
set -euo pipefail

WINDOW_ID=""
RECORDS=""
PROFILE="baseline"
DFGATE_REPO="${DFGATE_REPO:-../darkfactorio}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --window)
      WINDOW_ID="$2"
      shift 2
      ;;
    --records)
      RECORDS="$2"
      shift 2
      ;;
    --profile)
      PROFILE="$2"
      shift 2
      ;;
    --dfgate-repo)
      DFGATE_REPO="$2"
      shift 2
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$WINDOW_ID" || -z "$RECORDS" ]]; then
  echo "Usage: $0 --window <window_id> --records <runs.ndjson> [--profile baseline|adversarial] [--dfgate-repo ../darkfactorio]" >&2
  exit 1
fi

CRITERIA="profiles/level4-gate-v0.1-${PROFILE}.json"

if [[ ! -f "$DFGATE_REPO/$CRITERIA" ]]; then
  echo "Missing criteria file: $DFGATE_REPO/$CRITERIA" >&2
  exit 1
fi

if [[ ! -f "$RECORDS" ]]; then
  echo "Missing records file: $RECORDS" >&2
  exit 1
fi

if [[ "$RECORDS" = /* ]]; then
  RECORDS_ABS="$RECORDS"
else
  RECORDS_ABS="$(cd "$(dirname "$RECORDS")" && pwd)/$(basename "$RECORDS")"
fi

exec env GOWORK=off go -C "$DFGATE_REPO" run ./cmd/dfgatev01 \
  -input "$RECORDS_ABS" \
  -window "$WINDOW_ID" \
  -criteria "$CRITERIA" \
  -output text
