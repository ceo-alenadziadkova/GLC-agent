/**
 * Orchestrator / notification copy for pipeline_events and structured notifications.
 * Edit JSON for CMS-style changes without code churn.
 */
import raw from './pipeline-orchestrator-copy.v1.json' with { type: 'json' };

import { interpolatePipelineEventMessage } from './pipeline-events-copy.js';

export const PIPELINE_ORCHESTRATOR_COPY_VERSION = raw.version as string;

export type PipelineOrchestratorCopy = typeof raw;

export function pipelineOrchestratorCopy(): PipelineOrchestratorCopy {
  return raw;
}

/** User-safe message when free snapshot queue is at capacity (shared with SnapshotAtCapacityError). */
export function freeSnapshotCapacityUserMessage(): string {
  return raw.freeSnapshot.errorCapacity;
}

export function interpolateOrchestratorMessage(
  template: string,
  vars: Record<string, string | number>,
): string {
  return interpolatePipelineEventMessage(template, vars);
}
