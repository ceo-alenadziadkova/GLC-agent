/**
 * Copy segments for orchestration pack revision summaries (client portal).
 * Keep in sync with `server/src/services/orchestration/orchestration-pack-diff.ts` `summarizeOrchestrationPackRevisionDiff`.
 */

const JOINER = ', ';

export const ORCHESTRATION_REVISION_STORY_SEGMENTS = {
  nodesAdded: (n: number) => `+${n} initiatives`,
  nodesRemoved: (n: number) => `-${n} initiatives`,
  laneChanges: (n: number) => `${n} lane changes`,
  depsDelta: (added: number, removed: number) => `deps +${added}/-${removed}`,
  criticalPathUpdated: 'critical path updated',
  executionModeUpdated: 'execution mode updated',
  confidenceModelUpdated: 'confidence model updated',
  riskLayerUpdated: 'risk layer updated',
  domainInfluenceUpdated: 'domain influence updated',
  conflictsDelta: (before: number, after: number) => `conflicts ${before} -> ${after}`,
  noStructural: (from: number, to: number) => `No structural changes (v${from} -> v${to})`,
  withChanges: (from: number, to: number, segments: string[]) =>
    `v${from} -> v${to}: ${segments.join(JOINER)}`,
} as const;
