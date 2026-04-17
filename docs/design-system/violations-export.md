# Design system violations export (no allowlist)

Generated: 2026-04-17 via `node scripts/design-system-export-violations.mjs`.

This report lists findings **before** applying `scripts/design-system-baseline.allowlist.txt`. CI uses the allowlist to grandfather existing lines until they are migrated.

## Summary

| Audit | Parsed findings |
| --- | ---: |
| design-system-raw-values-check (app scope) | 34 |
| design-system-enforcement-check (app scope) | 0 |
| **Total rows** (merged raw + enforcement) | **34** |
| **Deduped rows** (written to `compliance-findings.full.txt`) | **34** |

## By violation type (merged)

| Type | Count |
| --- | ---: |
| `unit-literal` | 34 |

## Top files by finding count (merged)

| File | Count |
| --- | ---: |
| `src/app/components/ui/switch.tsx` | 3 |
| `src/app/components/ui/tabs.tsx` | 3 |
| `src/app/components/ui/checkbox.tsx` | 2 |
| `src/app/components/ui/context-menu.tsx` | 2 |
| `src/app/components/ui/dropdown-menu.tsx` | 2 |
| `src/app/components/ui/menubar.tsx` | 2 |
| `src/app/components/ui/select.tsx` | 2 |
| `src/app/components/ui/table.tsx` | 2 |
| `src/app/components/ui/accordion.tsx` | 1 |
| `src/app/components/ui/alert-dialog.tsx` | 1 |
| `src/app/components/ui/badge.tsx` | 1 |
| `src/app/components/ui/button.tsx` | 1 |
| `src/app/components/ui/calendar.tsx` | 1 |
| `src/app/components/ui/command.tsx` | 1 |
| `src/app/components/ui/dialog.tsx` | 1 |
| `src/app/components/ui/drawer.tsx` | 1 |
| `src/app/components/ui/input-otp.tsx` | 1 |
| `src/app/components/ui/input.tsx` | 1 |
| `src/app/components/ui/radio-group.tsx` | 1 |
| `src/app/components/ui/scroll-area.tsx` | 1 |
| `src/app/components/ui/sidebar/sidebar-chrome.tsx` | 1 |
| `src/app/components/ui/sidebar/sidebar-root.tsx` | 1 |
| `src/app/components/ui/textarea.tsx` | 1 |
| `src/app/components/ui/toggle.tsx` | 1 |

## Full findings (machine-readable)

One line per finding: `file:line [type] value`. Deduped merge of both audits (no allowlist).

- [`compliance-findings.full.txt`](./compliance-findings.full.txt) — **34** lines

## Regenerate

```bash
node scripts/design-system-export-violations.mjs
```
