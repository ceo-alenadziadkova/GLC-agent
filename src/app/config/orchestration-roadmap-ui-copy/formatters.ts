import type { OrchestrationManifestState, OrchestrationTimelineStatus } from '../orchestration-contract';
import type { OrchestrationUiCopy } from './types';

export const TIMELINE_MANIFEST_STATE_CLIENT: Record<OrchestrationManifestState, string> = {
  draft: 'Roadmap draft — scope may still change.',
  confirmed: 'Roadmap confirmed for this version.',
  stale: 'A newer roadmap draft exists — your consultant should refresh the saved plan.',
};

export function formatRoadmapGanttUnlocksCopy(copy: OrchestrationUiCopy, count: number): string {
  if (count <= 0) return copy.roadmapGanttUnlocksNone;
  if (count === 1) return copy.roadmapGanttUnlocksOne;
  return copy.roadmapGanttUnlocksMany.replace('{count}', String(count));
}

export function formatManifestStateForClient(copy: OrchestrationUiCopy, state: OrchestrationManifestState | string): string {
  if (state in TIMELINE_MANIFEST_STATE_CLIENT) {
    return TIMELINE_MANIFEST_STATE_CLIENT[state as OrchestrationManifestState];
  }
  return copy.timelineManifestStateUnknown;
}

export function formatTimelineApiStatusSupportLine(copy: OrchestrationUiCopy, status: OrchestrationTimelineStatus): string {
  return `${copy.timelineDiagnosticReasonLabel}: ${status}`;
}

export function formatTimelineCalendarPlanWindowLine(startIso: string, endIso: string): string {
  return `Calendar plan window: ${startIso} through ${endIso}. Near, mid, and later buckets follow this horizon.`;
}

export function formatTimelineCalendarPlanWindowLineClient(startIso: string, endIso: string): string {
  return `Dates on this plan: ${startIso} through ${endIso}. Near, mid, and later groups follow this range.`;
}
