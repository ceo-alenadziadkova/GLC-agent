# Design system violations export (no allowlist)

Generated: 2026-04-17 via `node scripts/design-system-export-violations.mjs`.

This report lists findings **before** applying `scripts/design-system-baseline.allowlist.txt`. CI uses the allowlist to grandfather existing lines until they are migrated.

## Summary

| Audit | Parsed findings |
| --- | ---: |
| design-system-raw-values-check (app scope) | 147 |
| design-system-enforcement-check (app scope) | 0 |
| **Total rows** (merged raw + enforcement) | **147** |
| **Deduped rows** (written to `compliance-findings.full.txt`) | **146** |

## By violation type (merged)

| Type | Count |
| --- | ---: |
| `unit-literal` | 146 |

## Top files by finding count (merged)

| File | Count |
| --- | ---: |
| `src/app/marketing/blocks/PackageMarketingHero.tsx` | 7 |
| `src/app/marketing/home/sections/HomeHeroSection.tsx` | 7 |
| `src/app/pages/snapshot-landing/components/SnapshotLandingResults.tsx` | 7 |
| `src/app/pages/pipeline-monitor/sections/PhaseSidebar.tsx` | 5 |
| `src/app/pages/SnapshotLanding.tsx` | 5 |
| `src/app/marketing/blocks/HomeHeroCockpit.tsx` | 4 |
| `src/app/marketing/home/components/SectionHeading.tsx` | 4 |
| `src/app/pages/DiscoveryQueue.tsx` | 4 |
| `src/app/pages/new-audit/NewAuditChrome.tsx` | 4 |
| `src/app/pages/new-audit/steps/Step2Confirm.tsx` | 4 |
| `src/app/pages/pipeline-monitor/sections/PhaseDetailPanel.tsx` | 4 |
| `src/app/components/ui/switch.tsx` | 3 |
| `src/app/components/ui/tabs.tsx` | 3 |
| `src/app/pages/admin-request-queue/components/AuditRequestQueueCard.tsx` | 3 |
| `src/app/pages/audit-workspace/sections/IssuesSection.tsx` | 3 |
| `src/app/pages/new-audit/steps/Step1Brief.tsx` | 3 |
| `src/app/pages/pipeline-monitor/PipelineMonitorPhaseUi.tsx` | 3 |
| `src/app/pages/settings/components/OptionPill.tsx` | 3 |
| `src/app/components/ui/checkbox.tsx` | 2 |
| `src/app/components/ui/context-menu.tsx` | 2 |
| `src/app/components/ui/dropdown-menu.tsx` | 2 |
| `src/app/components/ui/menubar.tsx` | 2 |
| `src/app/components/ui/select.tsx` | 2 |
| `src/app/components/ui/table.tsx` | 2 |
| `src/app/marketing/blocks/PackageAudienceSection.tsx` | 2 |
| `src/app/marketing/home/sections/HomeMetricsSection.tsx` | 2 |
| `src/app/pages/audit-workspace/config/ui.ts` | 2 |
| `src/app/pages/audit-workspace/sections/RecommendationsSection.tsx` | 2 |
| `src/app/pages/audit-workspace/sections/WorkspaceSidebar.tsx` | 2 |
| `src/app/pages/Dashboard.tsx` | 2 |
| `src/app/pages/NewAudit.tsx` | 2 |
| `src/app/pages/pipeline-monitor/config/pipeline-monitor-ui-policy.ts` | 2 |
| `src/app/pages/snapshot-landing/components/results/AccessStatusBadge.tsx` | 2 |
| `src/app/pages/snapshot-landing/components/results/ResultsCtaBand.tsx` | 2 |
| `src/app/pages/StrategyLab.tsx` | 2 |
| `src/app/components/ui/accordion.tsx` | 1 |
| `src/app/components/ui/alert-dialog.tsx` | 1 |
| `src/app/components/ui/badge.tsx` | 1 |
| `src/app/components/ui/button.tsx` | 1 |
| `src/app/components/ui/calendar.tsx` | 1 |

## Full findings (machine-readable)

One line per finding: `file:line [type] value`. Deduped merge of both audits (no allowlist).

- [`compliance-findings.full.txt`](./compliance-findings.full.txt) — **146** lines

## Regenerate

```bash
node scripts/design-system-export-violations.mjs
```
