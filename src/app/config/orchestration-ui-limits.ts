/**
 * Client-only limits for orchestration visualizations (avoid magic numbers in TSX).
 */
import type { OrchestrationSeasonPreset } from './orchestration-roadmap-manifest';

/** DOM id for Strategy Lab orchestration block (same id on Report Viewer timeline for in-page anchors). */
export const ORCHESTRATION_PANEL_DOM_ID = 'glc-execution-roadmap' as const;
/** DOM id for manifest setup entry section within timeline page. */
export const ORCHESTRATION_MANIFEST_SETUP_DOM_ID = 'manifest-setup' as const;
/**
 * Query param for `StrategyLab` / portal strategy routes: scroll to orchestration panel after navigation.
 * Example: `/strategy/:id?focus=roadmap`
 */
export const ORCHESTRATION_LAB_FOCUS_QUERY_KEY = 'focus' as const;
export const ORCHESTRATION_LAB_FOCUS_ROADMAP_VALUE = 'roadmap' as const;

export const ORCHESTRATION_UI_LIMITS = {
  /** Debounce before POST manifest preview (Strategy Lab + portal manifest wizard). */
  manifestPreviewDebounceMs: 400,
  /** Max execution pack rows listed on client portal timeline (V8 surface). */
  maxExecutionPackListItemsClient: 8,
  /** Max dependency rows shown under timeline (Report + Lab). */
  maxDependencyLinksDisplayed: 12,
  /** Max edge rows per added/removed list in revision diff (Strategy Lab). */
  maxRevisionDiffEdgesDisplayed: 18,
  /** Max lane-change rows in revision diff (Strategy Lab). */
  maxRevisionDiffLaneChangesDisplayed: 12,
  /** Max revision entries loaded for version diff history selector. */
  maxRevisionDiffHistoryItems: 10,
  /** V7: lane-pair cross narratives from pack graph (portal timeline). */
  maxCrossLaneNarrativePairs: 2,
  /** Max manifest snapshots loaded for history selector. */
  maxManifestSnapshotHistoryItems: 12,
  /** Strategy Lab orchestrator tab: dependency rows. */
  orchestratorDependenciesMaxEdges: 14,
  /** Strategy Lab orchestrator tab: conflict rows. */
  orchestratorRisksMaxItems: 12,
  /** Portal execution timeline: pack graph panel dependency rows (V5). */
  portalTimelinePackGraphMaxEdgesDisplayed: 24,
  /** Portal execution timeline: DOT export edge budget from the same panel (V5). */
  portalTimelinePackGraphExportMaxEdges: 64,
  /** Portal execution timeline: interactive flow canvas edge budget (V5). */
  portalTimelinePackGraphFlowMaxEdges: 40,
  /** Portal execution timeline: max nodes in the interactive flow (critical path kept first). */
  portalTimelinePackGraphFlowMaxNodes: 36,
  /** Portal execution timeline: expanded interactive map — edge budget (aligns with DOT export cap). */
  portalTimelinePackGraphFlowExpandedMaxEdges: 64,
  /** Portal execution timeline: expanded interactive map — node cap. */
  portalTimelinePackGraphFlowExpandedMaxNodes: 56,
  /** Portal execution timeline: interactive graph min height (layout only; CSS uses same token). */
  portalTimelinePackGraphCanvasMinHeightPx: 260,
  /** Portal execution timeline: expanded map min canvas height. */
  portalTimelinePackGraphCanvasExpandedMinHeightPx: 320,
  /** Mobile breakpoint for dependency card mode. */
  timelineDependencyCardModeMaxWidthPx: 768,
  /** Max dependency cards shown per list in mobile mode. */
  timelineDependencyCardsPerSectionMobile: 10,
  /** Deep-dive status polling interval after enqueue succeeds. */
  deepDiveStatusPollIntervalMs: 2000,
  /** Deep-dive status polling hard cap to avoid infinite waits. */
  deepDiveStatusPollMaxAttempts: 30,
} as const;

/** Rolling timeline windows used by roadmap projection (days). */
export const ORCHESTRATION_TIMELINE_TARGET_WINDOW_DAYS: Record<OrchestrationSeasonPreset, number> = {
  rolling_30d: 30,
  rolling_90d: 90,
  rolling_180d: 180,
};
