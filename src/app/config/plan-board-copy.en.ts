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
    'Re-sync runs the same deterministic reconcile hook as automated pack persists and refreshes orphaned metadata. Preview (when enabled) shows counts and short samples — it does not write to the database.',
  reconcileBannerCta: 'Re-sync with pack',
  reconcilePreviewCta: 'Preview changes',
  reconcilePreviewDialogTitle: 'Reconcile preview',
  reconcilePreviewDialogDescription:
    'Dry-run of the same reconcile projection used by Re-sync. Samples are capped for readability. Confirm to run the persisted reconcile.',
  reconcilePreviewSamplesNewHeading: 'Sample new backlog cards',
  reconcilePreviewSamplesOrphanHeading: 'Sample orphans (node removed)',
  reconcilePreviewMatchedLabel: 'Pack matches (cards aligned)',
  reconcilePreviewAddedLabel: 'New backlog cards from pack',
  reconcilePreviewOrphanNodeLabel: 'Cards marked orphan (node removed)',
  reconcilePreviewOrphanLaneLabel: 'Cards marked orphan (lane changed)',
  reconcilePreviewConfirmCta: 'Confirm and re-sync',
  reconcilePreviewCloseCta: 'Close',

  manualCardSectionTitle: 'Manual backlog cards',
  manualCardSectionHint: 'Creates a consultant-owned row (no roadmap node linkage). Stored with your lane snapshot label.',
  manualCardTitlePlaceholder: 'Initiative title',
  manualLanePlaceholder: 'lane_id e.g. marketing_narrative',
  manualSubmitCta: 'Add backlog card',
  /** Roadmap Gantt toolbar — opens dialog with shared manual card form (consultant). */
  roadmapToolbarAddManualCardCta: 'Add backlog card',

  dragHandleLabel: 'Drag',

  cardMenuAriaLabel: 'More actions',
  menuMoveHeading: 'Move to column',
  menuEditTitleLabel: 'Edit title',
  /** Fallback when inline title edit is available — opens modal for edge cases. */
  menuEditTitleDialogLabel: 'Edit title (dialog)…',
  menuEditLaneLabel: 'Edit lane',
  menuEditLaneDialogLabel: 'Edit lane (dialog)…',
  inlineTitleAriaLabel: 'Card title',
  inlineLaneAriaLabel: 'Change lane',
  menuDeleteCardLabel: 'Delete card',

  cardTitleEditDialogTitle: 'Edit card title',
  cardTitleEditFieldLabel: 'Title',
  cardTitleEditSave: 'Save title',
  cardTitleEditCancel: 'Cancel',

  cardLaneSimpleDialogTitle: 'Edit lane label',
  cardLaneSimpleFieldLabel: 'Lane',
  cardLaneSimpleSave: 'Save lane',
  cardLaneSimpleCancel: 'Cancel',

  cardDeleteDialogTitle: 'Remove card from Delivery Board?',
  cardDeleteDialogDescription:
    'This removes operational board state only. Packed roadmap nodes are unchanged.',
  cardDeleteConfirmCta: 'Delete card',
  cardDeleteConfirmCancel: 'Cancel',

  unifiedPlanStatusAriaLabel: 'Delivery plan status',
  unifiedPlanStatusHeading: 'Plan workspace status',

  boardSettingsTrigger: 'Board settings',
  boardSettingsTitle: 'Board columns',
  boardSettingsDescription:
    'Map workflow roles to your column ids. Saves remap existing cards deterministically.',
  boardSettingsSemanticsHeading: 'Workflow roles',
  boardSettingsColumnsHeading: 'Columns',
  boardSettingsResetCta: 'Reset to defaults',
  boardSettingsSaveCta: 'Save column layout',
  boardSettingsSavedToast: 'Column layout saved',
  boardSettingsResetToast: 'Columns reset to defaults',
  boardSettingsCancelCta: 'Close',
  boardSettingsAddColumnCta: 'Add column',
  boardSettingsValidationError:
    'Check column ids (lowercase, letters, digits, underscores) and assign each workflow role exactly once.',

  openOnRoadmapMenuLabel: 'Open on roadmap',

  draggingLiveMessage: 'Moving delivery card',

  parityNote: 'Narrative Timeline signals (top-window priority, baseline or deep lane mix) reuse the same read models as Timeline.',

  priorityWindow7dBadge: 'Top 7d',
  priorityWindow30dBadge: 'Top 30d',
  analysisDepthBaselineBadge: 'Baseline',
  analysisDepthDeepBadge: 'Deep',
  columnLaneMixLabel: 'Lane mix',

  manifestDraftPendingBadge: 'Manifest draft',
  manifestDraftLaneDialogTitle: 'Queue execution hint for manifest',
  manifestDraftLaneDialogDescription:
    'Selected lane and optional owner hint are saved with your next roadmap manifest snapshot in Strategy Lab.',
  manifestDraftLaneSelectLabel: 'Orchestration lane',
  manifestDraftOwnerHintLabel: 'Owner hint (optional)',
  manifestDraftLaneDialogSubmit: 'Queue hint',
  manifestDraftLaneDialogCancel: 'Cancel',

  governanceBlockedBannerTitle: 'Plan quality degraded',
  governanceBlockedBannerBody:
    'Delivery Board edits stay read-only until the orchestration pack is refined in Strategy Lab. This matches Timeline behavior when the plan is degraded.',
  governanceBlockedStrategyCta: 'Open Strategy Lab',

  /** Consultant: grouped governance / reconcile / manifest queue (progressive disclosure). */
  consultantPlanHealthSectionTitle: 'Plan workspace status',
  manifestDraftQueuePanelTitle: 'Manifest signing queue',

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
  /** Consultant roadmap drawer — points to toolbar action + Board tab for new backlog work. */
  roadmapDrawerConsultantManualTaskHint: 'Use Add backlog card on this toolbar or open the ',
  roadmapDrawerConsultantBoardTabLinkLabel: 'Board tab',
} as const;
