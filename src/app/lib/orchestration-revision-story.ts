import type { GlcOrchestrationPackRevisionDiffView } from '../data/audit/contracts/report/orchestration-pack.types';
import { ORCHESTRATION_REVISION_STORY_SEGMENTS } from '../config/orchestration-revision-story-copy.en';

/**
 * Client-side narrative for vN→vN+1 pack changes (portal / cockpit).
 * Mirrors server `summarizeOrchestrationPackRevisionDiff` wording so UI matches pack API summaries.
 */
export function buildOrchestrationRevisionStorySummary(
  diff: GlcOrchestrationPackRevisionDiffView | null | undefined,
): string | null {
  if (!diff) return null;

  const nodesAdded = diff.nodes_added.length;
  const nodesRemoved = diff.nodes_removed.length;
  const laneChanges = diff.nodes_lane_changed.length;
  const edgesAdded = diff.edges_added.length;
  const edgesRemoved = diff.edges_removed.length;

  const C = ORCHESTRATION_REVISION_STORY_SEGMENTS;
  const parts: string[] = [];

  if (nodesAdded > 0) parts.push(C.nodesAdded(nodesAdded));
  if (nodesRemoved > 0) parts.push(C.nodesRemoved(nodesRemoved));
  if (laneChanges > 0) parts.push(C.laneChanges(laneChanges));
  if (edgesAdded > 0 || edgesRemoved > 0) {
    parts.push(C.depsDelta(edgesAdded, edgesRemoved));
  }
  if (diff.critical_path_changed) parts.push(C.criticalPathUpdated);
  if (diff.execution_mode_changed) parts.push(C.executionModeUpdated);
  if (diff.confidence_map_changed) parts.push(C.confidenceModelUpdated);
  if (diff.risk_layer_changed) parts.push(C.riskLayerUpdated);
  if (diff.domain_influence_changed) parts.push(C.domainInfluenceUpdated);
  if (diff.conflicts_resolved_before !== diff.conflicts_resolved_after) {
    parts.push(C.conflictsDelta(diff.conflicts_resolved_before, diff.conflicts_resolved_after));
  }

  if (parts.length === 0) {
    return C.noStructural(diff.from_version, diff.to_version);
  }
  return C.withChanges(diff.from_version, diff.to_version, parts);
}
