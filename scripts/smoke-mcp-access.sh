#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="${ROOT_DIR}/config.toml"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if [[ -f "${ROOT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env" >/dev/null 2>&1
  set +a
fi

get_toml_value() {
  local section="$1"
  local key="$2"
  awk -v section="[${section}]" -v key="$key" '
    /^[[:space:]]*\[/ { in_section = ($0 == section) }
    in_section && $0 ~ "^[[:space:]]*" key "[[:space:]]*=" {
      line = $0
      sub(/^[^=]*=[[:space:]]*/, "", line)
      gsub(/^["\047]|["\047]$/, "", line)
      print line
      exit
    }
  ' "$CONFIG_FILE"
}

failures=0

check_mcp_registration() {
  local name="$1"
  if codex mcp get "$name" >/dev/null 2>&1; then
    printf '[PASS] MCP server registered: %s\n' "$name"
  else
    printf '[FAIL] MCP server missing: %s\n' "$name"
    failures=$((failures + 1))
  fi
}

check_sentry() {
  local region_url org_slug project_slug expected_project_id
  region_url="$(get_toml_value 'smoke_targets.sentry' 'region_url')"
  org_slug="$(get_toml_value 'smoke_targets.sentry' 'organization_slug')"
  project_slug="$(get_toml_value 'smoke_targets.sentry' 'project_slug')"
  expected_project_id="$(get_toml_value 'smoke_targets.sentry' 'project_id')"

  if [[ -z "${SENTRY_AUTH_TOKEN:-}" ]]; then
    printf '[FAIL] Sentry token missing: SENTRY_AUTH_TOKEN\n'
    failures=$((failures + 1))
    return
  fi

  local url="${region_url}/api/0/projects/${org_slug}/${project_slug}/"
  local code
  code="$(curl -sS -o "${TMP_DIR}/sentry.json" -w '%{http_code}' \
    -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
    -H 'Accept: application/json' \
    "$url")"

  if [[ "$code" != "200" ]]; then
    printf '[FAIL] Sentry project access: http=%s org=%s project=%s\n' "$code" "$org_slug" "$project_slug"
    failures=$((failures + 1))
    return
  fi

  local actual_id actual_slug
  actual_id="$(jq -r '.id // empty' "${TMP_DIR}/sentry.json")"
  actual_slug="$(jq -r '.slug // empty' "${TMP_DIR}/sentry.json")"

  if [[ "$actual_id" == "$expected_project_id" && "$actual_slug" == "$project_slug" ]]; then
    printf '[PASS] Sentry project verified: id=%s slug=%s\n' "$actual_id" "$actual_slug"
  else
    printf '[FAIL] Sentry project mismatch: expected(id=%s slug=%s) got(id=%s slug=%s)\n' \
      "$expected_project_id" "$project_slug" "$actual_id" "$actual_slug"
    failures=$((failures + 1))
  fi
}

check_langsmith() {
  local endpoint workspace_id project_name expected_project_id
  endpoint="$(get_toml_value 'smoke_targets.langsmith' 'endpoint')"
  workspace_id="$(get_toml_value 'smoke_targets.langsmith' 'workspace_id')"
  project_name="$(get_toml_value 'smoke_targets.langsmith' 'project_name')"
  expected_project_id="$(get_toml_value 'smoke_targets.langsmith' 'project_id')"

  if [[ -z "${LANGSMITH_API_KEY:-}" ]]; then
    printf '[FAIL] LangSmith key missing: LANGSMITH_API_KEY\n'
    failures=$((failures + 1))
    return
  fi

  local result
  if ! result="$(
    LANGSMITH_API_KEY="$LANGSMITH_API_KEY" \
    LANGSMITH_ENDPOINT="$endpoint" \
    LANGSMITH_PROJECT="$project_name" \
    pnpm -s tsx -e "import { Client } from 'langsmith'; (async () => { const c = new Client({ apiKey: process.env.LANGSMITH_API_KEY, apiUrl: process.env.LANGSMITH_ENDPOINT }); const target = process.env.LANGSMITH_PROJECT || ''; const iter = await c.listProjects({ projectName: target, limit: 3 }); const found = []; for await (const p of iter) { found.push({ id: p.id, name: p.name, tenant_id: (p as any).tenant_id ?? null }); if (found.length >= 3) break; } console.log(JSON.stringify({ target, found })); })().catch((err) => { console.error(String(err?.message || err)); process.exit(1); });"
  )"; then
    printf '[FAIL] LangSmith query failed for project=%s\n' "$project_name"
    failures=$((failures + 1))
    return
  fi

  printf '%s' "$result" >"${TMP_DIR}/langsmith.json"

  local count actual_id actual_name actual_workspace_id
  count="$(jq -r '.found | length' "${TMP_DIR}/langsmith.json")"

  if [[ "$count" -lt 1 ]]; then
    printf '[FAIL] LangSmith project not found: name=%s\n' "$project_name"
    failures=$((failures + 1))
    return
  fi

  actual_id="$(jq -r '.found[0].id // empty' "${TMP_DIR}/langsmith.json")"
  actual_name="$(jq -r '.found[0].name // empty' "${TMP_DIR}/langsmith.json")"
  actual_workspace_id="$(jq -r '.found[0].tenant_id // empty' "${TMP_DIR}/langsmith.json")"

  if [[ "$actual_id" == "$expected_project_id" && "$actual_name" == "$project_name" && "$actual_workspace_id" == "$workspace_id" ]]; then
    printf '[PASS] LangSmith project verified: id=%s name=%s workspace_id=%s\n' "$actual_id" "$actual_name" "$actual_workspace_id"
  else
    printf '[FAIL] LangSmith project mismatch: expected(id=%s name=%s workspace_id=%s) got(id=%s name=%s workspace_id=%s)\n' \
      "$expected_project_id" "$project_name" "$workspace_id" "$actual_id" "$actual_name" "$actual_workspace_id"
    failures=$((failures + 1))
  fi
}

check_mcp_registration "sentry"
check_mcp_registration "langsmith"
check_sentry
check_langsmith

if [[ "$failures" -eq 0 ]]; then
  printf '\nSmoke check status: PASS\n'
else
  printf '\nSmoke check status: FAIL (%s issue(s))\n' "$failures"
  exit 1
fi
