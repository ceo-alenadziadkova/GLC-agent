# Design system violations export (no allowlist)

Generated: 2026-04-17 via `node scripts/design-system-export-violations.mjs`.

This report lists findings **before** applying `scripts/design-system-baseline.allowlist.txt`. CI uses the allowlist to grandfather existing lines until they are migrated.

## Summary

| Audit | Parsed findings |
| --- | ---: |
| design-system-raw-values-check (app scope) | 313 |
| design-system-enforcement-check (app scope) | 114 |
| **Total rows** (raw + enforcement; duplicates possible across audits) | **427** |

## By violation type (merged)

| Type | Count |
| --- | ---: |
| `unit-literal` | 272 |
| `inline-visual-style` | 106 |
| `rgb-color` | 30 |
| `hex-color` | 11 |
| `config-token-like-raw` | 8 |

## Top files by finding count (merged)

| File | Count |
| --- | ---: |
| `src/app/pages/snapshot-landing/components/SnapshotLandingHeroForm.tsx` | 19 |
| `src/app/pages/discover/components/DiscoverResultsView.tsx` | 18 |
| `src/app/config/marketing-motion.ts` | 18 |
| `src/app/pages/intake-brief/components/IntakeBriefSuccessPhase.tsx` | 14 |
| `src/app/pages/DiscoveryPublicPage.tsx` | 12 |
| `src/app/pages/discover/components/FindingCard.tsx` | 12 |
| `src/app/pages/client-audit-view/config/ui.ts` | 9 |
| `src/app/pages/discover/components/DiscoverQuestionnaireView.tsx` | 9 |
| `src/app/pages/discover/components/QuestionInput.tsx` | 9 |
| `src/app/pages/intake-brief/components/IntakeBriefFormPhase.tsx` | 9 |
| `src/app/pages/pipeline-monitor/sections/PhaseSidebar.tsx` | 9 |
| `src/app/components/app-shell/config/app-shell-ui-policy.ts` | 8 |
| `src/app/pages/client-audit-view/sections/ClientBriefSection.tsx` | 8 |
| `src/app/components/ui/chart.tsx` | 7 |
| `src/app/pages/client-audit-view/sections/SnapshotUpgradeSection.tsx` | 7 |
| `src/app/pages/intake-brief/components/IntakeBriefReviewPhase.tsx` | 7 |
| `src/app/pages/new-audit/NewAuditChrome.tsx` | 7 |
| `src/app/pages/snapshot-landing/components/SnapshotLandingResults.tsx` | 7 |
| `src/app/components/app-shell/sections/DesktopSidebar.tsx` | 6 |
| `src/app/pages/snapshot-landing/SnapshotScoreBadge.tsx` | 6 |
| `src/app/pages/snapshot-landing/components/results/ResultsCtaBand.tsx` | 6 |
| `src/app/components/question-bank-studio/sections/StudioLegendSection.tsx` | 6 |
| `src/app/pages/SnapshotLanding.tsx` | 5 |
| `src/app/pages/discover/components/AuditTeaser.tsx` | 5 |
| `src/app/pages/new-audit/steps/Step1Brief.tsx` | 5 |
| `src/app/pages/settings/config/settings-ui-policy.ts` | 5 |
| `src/app/components/question-bank-studio/sections/StudioHeaderSection.tsx` | 5 |
| `src/app/marketing/blocks/DecisionPath.tsx` | 5 |
| `src/app/pages/DiscoveryQueue.tsx` | 4 |
| `src/app/pages/discover/components/ContactCaptureForm.tsx` | 4 |
| `src/app/pages/login/components/forms/SignInUpForm.tsx` | 4 |
| `src/app/pages/new-audit/steps/Step2Confirm.tsx` | 4 |
| `src/app/pages/pipeline-monitor/sections/PhaseDetailPanel.tsx` | 4 |
| `src/app/marketing/blocks/AuditCompare.tsx` | 4 |
| `src/app/components/ui/navigation-menu.tsx` | 3 |
| `src/app/components/ui/switch.tsx` | 3 |
| `src/app/components/ui/tabs.tsx` | 3 |
| `src/app/components/app-shell/sections/DesktopHeader.tsx` | 3 |
| `src/app/components/app-shell/sections/MobileDrawer.tsx` | 3 |
| `src/app/components/app-shell/sections/MobileHeader.tsx` | 3 |

## Regenerate

```bash
node scripts/design-system-export-violations.mjs
```
