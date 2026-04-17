# Design system violations export (no allowlist)

Generated: 2026-04-17 via `node scripts/design-system-export-violations.mjs`.

This report lists findings **before** applying `scripts/design-system-baseline.allowlist.txt`. CI uses the allowlist to grandfather existing lines until they are migrated.

## Summary

| Audit | Parsed findings |
| --- | ---: |
| design-system-raw-values-check (app scope) | 0 |
| design-system-enforcement-check (app scope) | 30 |
| **Total rows** (merged raw + enforcement) | **30** |
| **Deduped rows** (written to `compliance-findings.full.txt`) | **29** |

## By violation type (merged)

| Type | Count |
| --- | ---: |
| `inline-visual-style` | 29 |

## Top files by finding count (merged)

| File | Count |
| --- | ---: |
| `src/app/pages/intake-brief/components/IntakeBriefFormPhase.tsx` | 5 |
| `src/app/components/IntakeBankWizard.tsx` | 4 |
| `src/app/marketing/blocks/HomeHeroCockpit.tsx` | 4 |
| `src/app/pages/audit-workspace/sections/WorkspaceSidebar.tsx` | 3 |
| `src/app/components/BankClassicBriefFields.tsx` | 2 |
| `src/app/components/glc/ActivityFeed.tsx` | 2 |
| `src/app/components/glc/ScoreDistributionChart.tsx` | 2 |
| `src/app/components/portal-snapshot-account-mirror/sections/MirrorInsightsSection.tsx` | 1 |
| `src/app/components/portal-snapshot-account-mirror/sections/MirrorStatusHeaderSection.tsx` | 1 |
| `src/app/components/question-bank-studio/panels/ContextInputsPanel.tsx` | 1 |
| `src/app/components/question-bank-studio/sections/StudioLogicMetaSection.tsx` | 1 |
| `src/app/components/ui/chart.tsx` | 1 |
| `src/app/pages/FullAuditPage.tsx` | 1 |
| `src/app/pages/login/sections/LoginAuthCardSection.tsx` | 1 |

## Full findings (machine-readable)

One line per finding: `file:line [type] value`. Deduped merge of both audits (no allowlist).

- [`compliance-findings.full.txt`](./compliance-findings.full.txt) — **29** lines

## Regenerate

```bash
node scripts/design-system-export-violations.mjs
```
