import type { AuditTimelineDto } from '../data/api/orchestration-types';
import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';
import { ORCHESTRATION_LANE_LABELS, type OrchestrationLaneId } from '../config/orchestration-roadmap-ui-copy.en';
import { estimatedTimelineItemWindowWithinThirds } from './time-bucket-normalization';

export const MILESTONE_BAR_MS = 60_000;

export const CANONICAL_LANE_ORDER = Object.keys(ORCHESTRATION_LANE_LABELS) as OrchestrationLaneId[];

export function taskConfidenceFromPack(
  pack: GlcOrchestrationPackView | null,
  itemId: string,
): 'high' | 'medium' | 'low' | null {
  const raw = pack?.confidence_map?.node_confidence?.[itemId];
  if (raw === 'high' || raw === 'medium' || raw === 'low') return raw;
  return null;
}

export function dependencyKindFromRelation(
  relation: AuditTimelineDto['dependencies'][number]['relation'],
): 'FS' | 'SS' | 'FF' | 'SF' {
  if (relation === 'direct_blocker') return 'FS';
  if (relation === 'strong') return 'FS';
  if (relation === 'medium') return 'SS';
  return 'FF';
}

export function estimateTaskWindow(
  item: AuditTimelineDto['lanes'][number]['items'][number],
  buckets: Array<{ start: number; end: number }>,
): { start: number; end: number; isEstimated: boolean } {
  return estimatedTimelineItemWindowWithinThirds(item, buckets);
}

export function isOrchestrationLaneId(value: string): value is OrchestrationLaneId {
  return value in ORCHESTRATION_LANE_LABELS;
}
