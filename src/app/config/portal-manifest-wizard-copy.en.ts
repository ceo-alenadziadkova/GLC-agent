/**
 * Client portal — roadmap manifest guided flow (backlog V2).
 * Technical labels reuse ORCHESTRATION_UI_COPY / DOMAIN_LABELS; this module is wizard framing only.
 */

export const PORTAL_MANIFEST_WIZARD_COPY = {
  pageTitle: 'Roadmap setup',
  pageSubtitle: 'Confirm coverage and planning preferences, then save a manifest snapshot and build the execution pack.',
  introBody:
    'This guided flow uses the same steps as Strategy Lab but focuses only on your roadmap manifest. Your consultant can still adjust advanced options in Strategy Lab.',
  stepCoverageTitle: '1. Coverage from this audit',
  stepCoverageBody: 'Domains are fixed by your audit scope. They must match what your consultant confirmed for this engagement.',
  stepPreferencesTitle: '2. Execution preferences',
  stepPreviewTitle: '3. Preview',
  stepPreviewExtrasTitle: 'Plan signals (optional)',
  stepPreviewExtrasBody:
    'When a pack exists, compare a conservative vs accelerated manifest preview, and see effort and confidence for the critical path set.',
  stepPublishTitle: '4. Save manifest and build',
  stepPublishBody:
    'Saving creates a manifest snapshot. Building applies it to the next roadmap version (vN+1) when the server accepts the plan quality gate.',
  executionPlanMissing:
    'This audit does not have a resolved execution plan yet. Return when your consultant has confirmed scope.',
  strategyMissing: 'Strategy output is not available yet. Finish the audit pipeline first, then return here.',
  featureDisabled: 'This setup flow is not available in your workspace configuration.',
  backToAuditOverview: 'Back to audit overview',
  backToTimeline: 'Open execution timeline',
  openStrategyLab: 'Open Strategy Lab for advanced options',
  successPackBuilt: 'Roadmap updated. Open the timeline to review sequencing.',
  /** Short CTA on timeline / cockpit linking into this wizard */
  shortCta: 'Guided roadmap setup',
} as const;
