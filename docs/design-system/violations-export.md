# Design system violations export (no allowlist)

Generated: 2026-04-17 via `node scripts/design-system-export-violations.mjs`.

This report lists findings **before** applying `scripts/design-system-baseline.allowlist.txt`. CI uses the allowlist to grandfather existing lines until they are migrated.

## Summary

| Audit | Parsed findings |
| --- | ---: |
| design-system-raw-values-check (app scope) | 0 |
| design-system-enforcement-check (app scope) | 4 |
| **Total rows** (merged raw + enforcement) | **4** |
| **Deduped rows** (written to `compliance-findings.full.txt`) | **4** |

## By violation type (merged)

| Type | Count |
| --- | ---: |
| `inline-visual-style` | 4 |

## Top files by finding count (merged)

| File | Count |
| --- | ---: |
| `src/app/marketing/blocks/HomeHeroCockpit.tsx` | 4 |

## Full findings (machine-readable)

One line per finding: `file:line [type] value`. Deduped merge of both audits (no allowlist).

- [`compliance-findings.full.txt`](./compliance-findings.full.txt) — **4** lines

## Regenerate

```bash
node scripts/design-system-export-violations.mjs
```
