/**
 * User-facing strings for Delivery Board (`?view=board`).
 */

export const PLAN_BOARD_COPY = {
  shellTitle: 'Delivery Board',
  shellSubtitleConsultant:
    'Critical-path horizon plus persisted workflow columns. Drag cards between columns or use the per-card Move menu.',
  shellSubtitleReadOnlyClient:
    'Critical-path horizon plus delivery columns for your audit. Operational moves allowed where your role permits.',
  horizonSectionTitle: 'Execution horizon',
  horizonSectionSubtitle: 'Buckets from deterministic critical-path projection (same signal family as Timeline).',
  operationalSectionTitle: 'Operational columns',
  operationalSectionSubtitle: 'Backed by `plan_task_delivery` and reconciled on each persisted pack version.',

  emptyNoPackTitle: 'No orchestration pack yet',
  emptyNoPackBody: 'Open Strategy Lab to build a manifest and generate the first plan.',
  openStrategyLabCta: 'Open Strategy Lab',
  bucketNowColumnTitle: 'Now',
  bucketNextColumnTitle: 'Next',
  bucketLaterColumnTitle: 'Later',
  laneLabelPrefix: 'Lane',
  criticalPathBadge: 'Critical path',
  readOnlyAnnouncement: 'Delivery workflow columns expose persisted operational state beside the horizon projection.',

  operationalEmptyPlaceholder: 'No cards yet — they appear automatically after Strategy Lab persists a pack (and reconcile runs).',

  orphanBadgeAriaNodeRemoved: 'Orphan reason: roadmap node removed from the saved pack.',
  orphanBadgeAriaLaneChanged: 'Orphan reason: lane mismatch after a pack reconcile.',
  orphanBadgeLabelNodeRemoved: 'Node removed',
  orphanBadgeLabelLaneChanged: 'Lane changed',

  reconcileBannerTitle: 'Some cards no longer align with the latest saved pack snapshot.',
  reconcileBannerBody:
    'Re-sync runs the same deterministic reconcile hook as automated pack persists and refreshes orphaned metadata.',
  reconcileBannerCta: 'Re-sync with pack',

  manualCardSectionTitle: 'Manual backlog cards',
  manualCardSectionHint: 'Creates a consultant-owned row (no roadmap node linkage). Stored with your lane snapshot label.',
  manualCardTitlePlaceholder: 'Initiative title',
  manualLanePlaceholder: 'lane_id e.g. marketing_narrative',
  manualSubmitCta: 'Add backlog card',

  dragHandleLabel: 'Drag',

  cardMenuAriaLabel: 'More actions',
  menuMoveHeading: 'Move to column',

  draggingLiveMessage: 'Moving delivery card',

  parityNote: 'Narrative Timeline signals (top-window priority, baseline or deep lane mix) reuse the same read models as Timeline.',

  priorityWindow7dBadge: 'Top 7d',
  priorityWindow30dBadge: 'Top 30d',
  analysisDepthBaselineBadge: 'Baseline',
  analysisDepthDeepBadge: 'Deep',
  columnLaneMixLabel: 'Lane mix',

  governanceBlockedBannerTitle: 'Plan quality degraded',
  governanceBlockedBannerBody:
    'Delivery Board edits stay read-only until the orchestration pack is refined in Strategy Lab. This matches Timeline behavior when the plan is degraded.',
  governanceBlockedStrategyCta: 'Open Strategy Lab',

  manualBeyondNextUpBanner:
    'This work is not in the current orchestration pack. Add it to the manifest in Strategy Lab so critical-path signals stay aligned.',
  roadmapDrawerDeliveryBoardCta: 'Manage status on Delivery Board',

  /** Roadmap task drawer — same mutation contract as Board per-card Move menu (ADR cross-view §5). */
  roadmapDrawerMoveMenuHeading: 'Move to workflow column',
  roadmapDrawerMoveMenuAriaLabel: 'Open move-to-column actions for delivery workflow',
  roadmapDrawerMoveNoCardHint:
    'No delivery-board row linked to this task yet. Save a pack on Strategy Lab, then open the Delivery Board.',
  roadmapDrawerMoveGovernanceBlockedHint:
    'Plan quality gates block workflow edits. Refine the pack in Strategy Lab, then retry.',
  roadmapDrawerMoveNoPackHint: 'Workflow moves need a saved orchestration pack. Start from Strategy Lab.',
  roadmapDrawerMoveSuccessToast: 'Workflow column updated',
  roadmapDrawerMoveErrorToast: 'Could not update workflow column. Try again or open the Delivery Board.',
} as const;
