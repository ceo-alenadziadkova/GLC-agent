import type { RoadmapManifestPreviewDto } from '../data/api/orchestration-types';

export type ScenarioCompareResult = {
  lanesAdded: string[];
  lanesRemoved: string[];
  compressionChanged: boolean;
  densityChanged: boolean;
  waitingListDelta: number;
  summary: string;
};

/**
 * Shallow diff of two manifest previews (for what-if / scenario compare).
 */
export function compareRoadmapManifestPreviews(
  a: RoadmapManifestPreviewDto,
  b: RoadmapManifestPreviewDto,
): ScenarioCompareResult {
  const aInc = new Set(a.lanes_included);
  const bInc = new Set(b.lanes_included);
  const lanesAdded = [...bInc].filter(x => !aInc.has(x));
  const lanesRemoved = [...aInc].filter(x => !bInc.has(x));
  const compressionChanged = a.execution_compression_hint !== b.execution_compression_hint;
  const densityChanged = a.lane_density_band !== b.lane_density_band;
  const waitingListDelta = b.waiting_list_domains.length - a.waiting_list_domains.length;
  const parts: string[] = [];
  if (lanesAdded.length) parts.push(`+lanes: ${lanesAdded.join(', ')}`);
  if (lanesRemoved.length) parts.push(`-lanes: ${lanesRemoved.join(', ')}`);
  if (compressionChanged) parts.push('compression changed');
  if (densityChanged) parts.push('density band changed');
  if (waitingListDelta !== 0) parts.push(`waiting list Δ ${waitingListDelta > 0 ? '+' : ''}${waitingListDelta}`);
  const summary = parts.length ? parts.join(' · ') : 'No structural differences in preview';
  return {
    lanesAdded,
    lanesRemoved,
    compressionChanged,
    densityChanged,
    waitingListDelta,
    summary,
  };
}
