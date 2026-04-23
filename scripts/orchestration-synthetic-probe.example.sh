#!/usr/bin/env bash
# Example synthetic probe for orchestration SLO (staging / canary).
# Wire to cron, GitHub Actions, or a synthetic monitor. Exit non-zero on failure.
#
# Required: API_BASE (e.g. https://api.example.com)
# Optional: ORCHESTRATION_PROBE_TOKEN (Bearer for timeline); ORCHESTRATION_CANARY_AUDIT_ID
set -euo pipefail
API_BASE="${API_BASE:-}"
if [[ -z "$API_BASE" ]]; then
  echo "Set API_BASE to your Railway/API origin" >&2
  exit 1
fi
code=$(curl -sS -o /dev/null -w '%{http_code}' "${API_BASE%/}/api/health")
if [[ "$code" != "200" ]]; then
  echo "health: expected 200, got $code" >&2
  exit 1
fi
if [[ -n "${ORCHESTRATION_PROBE_TOKEN:-}" && -n "${ORCHESTRATION_CANARY_AUDIT_ID:-}" ]]; then
  tcode=$(
    curl -sS -o /dev/null -w '%{http_code}' \
      -H "Authorization: Bearer ${ORCHESTRATION_PROBE_TOKEN}" \
      "${API_BASE%/}/api/audits/${ORCHESTRATION_CANARY_AUDIT_ID}/timeline"
  )
  if [[ "$tcode" != "200" ]]; then
    echo "timeline: expected 200, got $tcode" >&2
    exit 1
  fi
fi
echo "orchestration synthetic probe: ok"
exit 0
