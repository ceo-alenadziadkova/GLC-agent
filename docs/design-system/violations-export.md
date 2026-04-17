# Design system violations export (no allowlist)

Generated: 2026-04-17 via `node scripts/design-system-export-violations.mjs`.

This report lists findings **before** applying `scripts/design-system-baseline.allowlist.txt` and `scripts/design-system-primitive-boundary.allowlist.txt`. CI uses those allowlists to grandfather existing lines until they are migrated.

## Summary

| Audit | Parsed findings |
| --- | ---: |
| design-system-raw-values-check (app scope) | 0 |
| design-system-enforcement-check (app scope) | 4 |
| design-system-ts-color-literals-check (src + server/src) | 0 |
| design-system-primitive-boundary-check | 4 |
| **Total rows** (merged raw + enforcement + ts-color + primitive-boundary) | **8** |
| **Deduped rows** (written to `compliance-findings.full.txt`) | **8** |

## By violation type (merged)

| Type | Count |
| --- | ---: |
| `inline-visual-style` | 4 |
| `primitive-boundary-inline` | 4 |

## Top files by finding count (merged)

| File | Count |
| --- | ---: |
| `src/app/marketing/blocks/HomeHeroCockpit.tsx` | 8 |

## Full findings (machine-readable)

One line per finding: `file:line [type] value`. Deduped merge of audits (no allowlist / no primitive-boundary allowlist).

- [`compliance-findings.full.txt`](./compliance-findings.full.txt) — **8** lines

## Regenerate

```bash
node scripts/design-system-export-violations.mjs
```
