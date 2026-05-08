/**
 * IA: timeline-first vs Strategy Lab (ADR Phase 4). Single narrative SSOT for portal, Lab, cockpit.
 */
export const ORCHESTRATION_IA_COPY = {
  /** One line under Strategy / Plan chrome — Strategy Lab defines contract; Plan runs delivery surfaces. */
  strategyVsPlanMicroHint:
    'Strategy Lab defines context, manifest, and pack rebuilds. Plan runs delivery — Board, Roadmap schedule, or Table.',
  /** Long-form IA note (portal timeline, cockpit); Strategy Lab avoids repeating this on-page. */
  timelineVsLabRole:
    'Timeline is the primary view for sequencing, critical path, and cross-lane sync. Strategy Lab is for manifest snapshots, rebuilding the pack (vN+1), version diffs, coverage offers, and deep node detail.',
  /** AppShell subtitle on portal timeline when plan-workspace-primary UX is enabled. */
  timelinePageSubtitleWhenPrimary:
    'Sequencing and seasonal buckets live here. Strategy Lab in the toolbar covers manifest snapshots, new pack versions, and node detail.',
  /** Footnote under primary CTAs on client cockpit. */
  clientCockpitTimelineFootnote:
    'Sequencing and seasonal buckets live on the execution timeline; Strategy Lab remains the place for manifest and pack tooling.',
  /** Strategy Lab AppShell — single canonical line (duplicated Timeline vs Lab copy removed from the page body). */
  strategyLabAppShellSubtitle:
    'Define context, configure the manifest, and build the execution pack — then continue in Plan (Board, Roadmap, or Timeline).',
  /** Secondary line on client navigation cards (timeline). */
  clientNavTimelineCardSubtitle: 'Primary sequencing — seasonal buckets, lanes, and dependencies.',
  /** Secondary line on client navigation cards (Lab). */
  clientNavLabCardSubtitle: 'Manifest snapshots, pack tooling, and node-level detail.',
} as const;
