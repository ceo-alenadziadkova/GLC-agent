# Design system violations export (no allowlist)

Generated: 2026-04-17 via `node scripts/design-system-export-violations.mjs`.

This report lists findings **before** applying `scripts/design-system-baseline.allowlist.txt`. CI uses the allowlist to grandfather existing lines until they are migrated.

## Summary

| Audit | Parsed findings |
| --- | ---: |
| design-system-raw-values-check (app scope) | 315 |
| design-system-enforcement-check (app scope) | 97 |
| **Total rows** (merged raw + enforcement) | **412** |
| **Deduped rows** (written to `compliance-findings.full.txt`) | **408** |

## By violation type (merged)

| Type | Count |
| --- | ---: |
| `unit-literal` | 275 |
| `inline-visual-style` | 97 |
| `rgb-color` | 30 |
| `hex-color` | 6 |

## Top files by finding count (merged)

| File | Count |
| --- | ---: |
| `src/app/pages/snapshot-landing/components/SnapshotLandingHeroForm.tsx` | 19 |
| `src/app/pages/discover/components/DiscoverResultsView.tsx` | 18 |
| `src/app/pages/intake-brief/components/IntakeBriefSuccessPhase.tsx` | 14 |
| `src/app/pages/DiscoveryPublicPage.tsx` | 12 |
| `src/app/pages/discover/components/FindingCard.tsx` | 11 |
| `src/app/pages/discover/components/DiscoverQuestionnaireView.tsx` | 9 |
| `src/app/pages/discover/components/QuestionInput.tsx` | 9 |
| `src/app/pages/intake-brief/components/IntakeBriefFormPhase.tsx` | 9 |
| `src/app/pages/pipeline-monitor/sections/PhaseSidebar.tsx` | 9 |
| `src/app/marketing/blocks/DecisionPath.tsx` | 8 |
| `src/app/marketing/MarketingHeader.tsx` | 8 |
| `src/app/pages/client-audit-view/sections/ClientBriefSection.tsx` | 8 |
| `src/app/marketing/blocks/HomeHeroCockpit.tsx` | 7 |
| `src/app/marketing/blocks/PackageMarketingHero.tsx` | 7 |
| `src/app/marketing/home/sections/HomeHeroSection.tsx` | 7 |
| `src/app/pages/client-audit-view/sections/SnapshotUpgradeSection.tsx` | 7 |
| `src/app/pages/intake-brief/components/IntakeBriefReviewPhase.tsx` | 7 |
| `src/app/pages/new-audit/NewAuditChrome.tsx` | 7 |
| `src/app/pages/snapshot-landing/components/SnapshotLandingResults.tsx` | 7 |
| `src/app/components/question-bank-studio/sections/StudioLegendSection.tsx` | 6 |
| `src/app/features/report-viewer/components/ProfileTabs.tsx` | 6 |
| `src/app/marketing/blocks/NextStepsCta.tsx` | 6 |
| `src/app/pages/snapshot-landing/components/results/ResultsCtaBand.tsx` | 6 |
| `src/app/pages/snapshot-landing/SnapshotScoreBadge.tsx` | 6 |
| `src/app/components/question-bank-studio/sections/StudioHeaderSection.tsx` | 5 |
| `src/app/pages/discover/components/AuditTeaser.tsx` | 5 |
| `src/app/pages/new-audit/steps/Step1Brief.tsx` | 5 |
| `src/app/pages/SnapshotLanding.tsx` | 5 |
| `src/app/features/report-viewer/components/ReportFindings.tsx` | 4 |
| `src/app/marketing/home/components/SectionHeading.tsx` | 4 |
| `src/app/pages/discover/components/ContactCaptureForm.tsx` | 4 |
| `src/app/pages/DiscoveryQueue.tsx` | 4 |
| `src/app/pages/login/components/forms/SignInUpForm.tsx` | 4 |
| `src/app/pages/new-audit/steps/Step2Confirm.tsx` | 4 |
| `src/app/pages/pipeline-monitor/sections/PhaseDetailPanel.tsx` | 4 |
| `src/app/components/question-bank-studio/sections/StudioModeSummarySection.tsx` | 3 |
| `src/app/components/question-bank-studio/sections/StudioToolbarSection.tsx` | 3 |
| `src/app/components/snapshot/SnapshotAccessBlockedCallout.tsx` | 3 |
| `src/app/components/snapshot/SnapshotScoreKit.tsx` | 3 |
| `src/app/components/ui/switch.tsx` | 3 |

## Full findings (machine-readable)

One line per finding: `file:line [type] value`. Deduped merge of both audits (no allowlist).

- [`compliance-findings.full.txt`](./compliance-findings.full.txt) — **408** lines

## Regenerate

```bash
node scripts/design-system-export-violations.mjs
```
