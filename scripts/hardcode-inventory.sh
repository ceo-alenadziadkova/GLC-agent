#!/usr/bin/env bash
# Heuristic inventory of literals worth reviewing (URLs, env-style strings, long timeouts).
#
# Excluded from scans (hardcode audit policy — library / vendor-scale / snapshot engine):
#   - server/src/snapshot/**          (snapshot engine, fetch-tiered, snapshot-fetch-heuristics, etc.)
#   - server/src/lib/wappalyzer-imported-rules.ts
#   - server/src/lib/site-html-signals.ts
#   - **/*.test.ts, **/*.test.tsx, **/__tests__/**
#   - server/scripts/seed-demo.ts
#
# Prefers ripgrep (rg); falls back to grep if rg is not installed.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GREP_EXCLUDE=(
  --exclude-dir=node_modules
  --exclude-dir=dist
  --exclude-dir=.git
  --exclude='*.test.ts'
  --exclude='*.test.tsx'
  --exclude='seed-demo.ts'
  --exclude='wappalyzer-imported-rules.ts'
  --exclude='site-html-signals.ts'
)

filter_snapshot_tests() {
  grep -v 'server/src/snapshot/' | grep -v '/__tests__/' | grep -v '\.test\.ts:' || true
}

echo "=== hardcode-inventory — repo root: $ROOT ==="
echo

if command -v rg >/dev/null 2>&1; then
  echo "(using ripgrep)"
  GLOB_ARGS=(
    --glob '!**/node_modules/**'
    --glob '!**/dist/**'
    --glob '!server/src/snapshot/**'
    --glob '!**/*.test.ts'
    --glob '!**/*.test.tsx'
    --glob '!**/__tests__/**'
    --glob '!server/scripts/seed-demo.ts'
    --glob '!**/wappalyzer-imported-rules.ts'
    --glob '!server/src/lib/site-html-signals.ts'
  )
  echo "--- http(s) URLs in TS/TSX (sample) ---"
  rg "${GLOB_ARGS[@]}" 'https?://\S+' --glob '*.ts' --glob '*.tsx' -n --heading --no-messages | head -n 120 || true
  echo
  echo "--- localhost / 127.0.0.1 ---"
  rg "${GLOB_ARGS[@]}" 'localhost|127\.0\.0\.1' --glob '*.ts' --glob '*.tsx' -n --heading --no-messages | head -n 80 || true
  echo
  echo "--- process.env.[A-Z0-9_]+ reads (popularity) ---"
  rg "${GLOB_ARGS[@]}" 'process\.env\.[A-Z0-9_]+' --glob '*.ts' -o --no-filename --no-messages \
    | sort | uniq -c | sort -nr | head -n 40 || true
  echo
  echo "--- magic millisecond literals (>= 1000) in server/src (excl. snapshot) ---"
  rg "${GLOB_ARGS[@]}" '\b[1-9][0-9]{3,}\b' server/src --glob '*.ts' -n --no-messages \
    | rg -v 'server/src/snapshot/' | head -n 80 || true
  echo
  echo "--- import.meta.env (Vite) ---"
  rg "${GLOB_ARGS[@]}" 'import\.meta\.env\.[A-Z0-9_]+' --glob '*.ts' --glob '*.tsx' -o --no-filename --no-messages \
    | sort | uniq -c | sort -nr | head -n 40 || true
else
  echo "(ripgrep not found; using grep — install rg for stricter excludes)"
  echo "--- http(s) URLs in TS/TSX (sample) ---"
  grep -rhnE 'https?://[^[:space:]]+' --include='*.ts' --include='*.tsx' "${GREP_EXCLUDE[@]}" . 2>/dev/null \
    | filter_snapshot_tests | head -n 120 || true
  echo
  echo "--- localhost / 127.0.0.1 ---"
  grep -rhnE 'localhost|127\.0\.0\.1' --include='*.ts' --include='*.tsx' "${GREP_EXCLUDE[@]}" . 2>/dev/null \
    | filter_snapshot_tests | head -n 80 || true
  echo
  echo "--- process.env reads (sample) ---"
  grep -rhoE 'process\.env\.[A-Z0-9_]+' --include='*.ts' "${GREP_EXCLUDE[@]}" . 2>/dev/null \
    | sort | uniq -c | sort -nr | head -n 40 || true
  echo
  echo "--- magic millisecond literals in server/src (sample) ---"
  grep -rhnE '\b[1-9][0-9]{3,}\b' --include='*.ts' "${GREP_EXCLUDE[@]}" server/src 2>/dev/null \
    | grep -v 'server/src/snapshot/' | head -n 80 || true
  echo
  echo "--- import.meta.env (Vite) ---"
  grep -rhoE 'import\.meta\.env\.[A-Z0-9_]+' --include='*.ts' --include='*.tsx' "${GREP_EXCLUDE[@]}" . 2>/dev/null \
    | sort | uniq -c | sort -nr | head -n 40 || true
fi

echo
echo "Done. Truncated with head; remove head for full lists."
