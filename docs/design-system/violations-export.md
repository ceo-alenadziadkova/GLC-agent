# Design system violations export (§4.1 migration drift mirror)

Generated: 2026-04-17 via `pnpm run audit:ds:migration-report` (`node scripts/design-system-export-violations.mjs`).

**§4.1 Migration pipeline:** same audits as **§4.2** but baseline and primitive-boundary subprocesses run **without** grandfather allowlists (subprocess env matches strict `audit:ds:runtime`). This file is **not** the merge gate — use it to see drift while shrinking toward zero. **§4.2 Runtime governance:** `pnpm run audit:ds:ci` / `audit:ds:runtime` — **0** baseline/PB grandfather violations; only `scripts/design-system-ts-color-allowlist.txt` (PDF bridge) may suppress ts-color findings.

## Summary

| Audit | Parsed findings |
| --- | ---: |
| design-system-raw-values-check (app scope) | 0 |
| design-system-enforcement-check (app scope) | 0 |
| design-system-ts-color-literals-check (src + server/src) | 0 |
| design-system-primitive-boundary-check | 0 |
| design-system-patterns-lock-check | 0 |
| **Total rows** (merged raw + enforcement + ts-color + primitive-boundary + patterns-lock) | **0** |
| **Deduped rows** (written to `compliance-findings.full.txt`) | **0** |

## By violation type (merged)

| Type | Count |
| --- | ---: |

## Top files by finding count (merged)

| File | Count |
| --- | ---: |

## Full findings (machine-readable)

One line per finding: `file:line [type] value`. Deduped merge of §4.1 subprocess output (no baseline / no primitive-boundary grandfather; patterns-lock has no allowlist).

- [`compliance-findings.full.txt`](./compliance-findings.full.txt) — **0** lines

## Regenerate

```bash
pnpm run audit:ds:migration-report
# or: node scripts/design-system-export-violations.mjs
```
