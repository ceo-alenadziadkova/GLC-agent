export type CaoZoneStage = 'discovery' | 'deep_audit';

export type CaoSubAgentDepth = 'min' | 'standard' | 'max' | 'deferred';

export type CaoMvpSubAgentId = 'cao.process_map' | 'cao.automation_candidates' | 'cao.throughput';

/**
 * Stage-aware depth matrix for CAO MVP sub-agents (process map → automation → throughput).
 * Aligns with docs/instructions/CAO-INSTRUCTIONS.md two-stage model.
 */
export const DIRECTOR_CAO_ACCESS_AGENT_DEPTHS: Record<CaoZoneStage, Record<CaoMvpSubAgentId, CaoSubAgentDepth>> = {
  discovery: {
    'cao.process_map': 'standard',
    'cao.automation_candidates': 'standard',
    'cao.throughput': 'min',
  },
  deep_audit: {
    'cao.process_map': 'max',
    'cao.automation_candidates': 'max',
    'cao.throughput': 'standard',
  },
};

export function routeCaoAccessLevel(zoneStage: CaoZoneStage): CaoZoneStage {
  return zoneStage;
}

export function listCaoMvpAgentIds(): readonly CaoMvpSubAgentId[] {
  return ['cao.process_map', 'cao.automation_candidates', 'cao.throughput'];
}
