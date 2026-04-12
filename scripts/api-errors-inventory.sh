#!/usr/bin/env bash
# List JSON error literals in server route handlers (maintenance aid for docs/API_ERRORS_INVENTORY.md).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if ! command -v rg >/dev/null 2>&1; then
  echo "rg (ripgrep) is required" >&2
  exit 1
fi
echo "# Matches: res.json / .json with error: '...' or error: \`...\` in server/src/routes"
echo
rg -n "error:\s*['\`]" server/src/routes --glob '*.ts' | sort || true
