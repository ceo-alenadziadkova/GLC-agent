/**
 * Unified copy for Plan workspace surfaces (Delivery Board tab + Roadmap/Gantt tab).
 * Keeps loading narrative and interaction scope aligned across `/plan` and `/portal/plan`.
 */

export const PLAN_WORKSPACE_UI_COPY = {
  /** Shared loading headline while audit, pack, and/or timeline are resolving. */
  loadingHeadline: 'Loading plan workspace…',
  /** Single secondary line — avoids mismatched subtitles between Board and Roadmap loaders. */
  loadingDetail:
    'Fetching your audit row, saved execution pack, and schedule projection. This usually takes a few seconds.',
  /**
   * Shown on the Roadmap tab when plan-board hydration is still in flight (optional strip / drawer moves).
   * Does not block the Gantt when timeline + projection are already ready.
   */
  roadmapHydratingDeliveryBoardHint: 'Loading delivery board statuses for cross-view hints…',
  /**
   * Product scope: Roadmap bars are a read-only projection from pack + timeline; workflow DnD lives on Board.
   */
  roadmapViewInteractionScopeNote:
    'Bars follow the saved pack and timeline. Change workflow on the Board tab (columns, manual cards, re-sync).',
  /** Collapsible scope callout trigger (Roadmap tab). */
  roadmapScopeCalloutExpandTrigger: 'How this schedule relates to the Board',
  roadmapScopeCalloutCollapseTrigger: 'Hide schedule vs Board note',
  /** Screen-reader companion for the roadmap scope callout landmark. */
  roadmapViewInteractionScopeAriaLabel: 'How Roadmap compares to Delivery Board',
  /** Inline when pack governance blocks operational edits (mirror Board read-only). */
  roadmapScopeCalloutGovernanceNote:
    'Delivery Board edits are read-only until plan quality improves — use Strategy Lab (same as on the Board tab).',
  /** Inline when delivery cards are orphaned; `{count}` placeholder for card count. */
  roadmapScopeCalloutOrphanNote: '{count} workflow card(s) are out of sync with the saved pack — open the Board tab to re-sync.',
  /** Hides the educational callout until a new browser session (shown when there is no urgent plan signal). */
  roadmapScopeCalloutDismissForSession: 'Hide this tip for this session',

  /** Sticky Plan chrome — consultant jumps back to orchestration/manifest tooling. */
  planWorkbenchConsultantPrimaryLabel: 'Strategy Lab · manifest & pack',
  planWorkbenchConsultantPrimaryAriaLabel: 'Open Strategy Lab for manifest, pack saves, and rebuilds.',
  /** Sticky Plan chrome — client lands on operational board when rollout allows, else roadmap. */
  planWorkbenchClientPrimaryLabel: "This week's priorities",
  planWorkbenchClientPrimaryAriaLabel: 'Go to Delivery Board when available, otherwise the roadmap schedule.',
} as const;
