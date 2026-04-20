/**
 * Client-only limits for orchestration visualizations (avoid magic numbers in TSX).
 */
import type { OrchestrationSeasonPreset } from './orchestration-roadmap-manifest';

/** DOM id for Strategy Lab orchestration block (same id on Report Viewer timeline for in-page anchors). */
export const ORCHESTRATION_PANEL_DOM_ID = 'glc-execution-roadmap' as const;

export const ORCHESTRATION_UI_LIMITS = {
  /** Max dependency rows shown under timeline (Report + Lab). */
  maxDependencyLinksDisplayed: 12,
  /** Max edge rows per added/removed list in revision diff (Strategy Lab). */
  maxRevisionDiffEdgesDisplayed: 18,
  /** Max lane-change rows in revision diff (Strategy Lab). */
  maxRevisionDiffLaneChangesDisplayed: 12,
  /** Max revision entries loaded for version diff history selector. */
  maxRevisionDiffHistoryItems: 10,
  /** Max manifest snapshots loaded for history selector. */
  maxManifestSnapshotHistoryItems: 12,
  /** Strategy Lab orchestrator tab: dependency rows. */
  orchestratorDependenciesMaxEdges: 14,
  /** Strategy Lab orchestrator tab: conflict rows. */
  orchestratorRisksMaxItems: 12,
} as const;

/** Rolling timeline windows used by roadmap projection (days). */
export const ORCHESTRATION_TIMELINE_TARGET_WINDOW_DAYS: Record<OrchestrationSeasonPreset, number> = {
  rolling_30d: 30,
  rolling_90d: 90,
  rolling_180d: 180,
};
