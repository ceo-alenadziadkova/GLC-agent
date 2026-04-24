export type CaoZoneStage = 'discovery' | 'deep_audit';

export type CaoSubAgentDepth = 'min' | 'standard' | 'max' | 'deferred';

export type CaoMvpSubAgentId =
  | 'cao.process_map'
  | 'cao.sop_governance'
  | 'cao.sla_targets'
  | 'cao.data_quality_gates'
  | 'cao.adoption_rollout_governance'
  | 'cao.automation_candidates'
  | 'cao.integrations_handoffs'
  | 'cao.followup_notifications'
  | 'cao.billing_quote_automation'
  | 'cao.ai_ops_guardrails'
  | 'cao.throughput'
  | 'cao.build_vs_buy'
  | 'cao.synthesis_bundle';

/**
 * Stage-aware depth matrix for CAO MVP sub-agents (process map → automation → throughput).
 * Aligns with docs/instructions/CAO-INSTRUCTIONS.md two-stage model.
 */
export const DIRECTOR_CAO_ACCESS_AGENT_DEPTHS: Record<CaoZoneStage, Record<CaoMvpSubAgentId, CaoSubAgentDepth>> = {
  discovery: {
    'cao.process_map': 'standard',
    'cao.sop_governance': 'deferred',
    'cao.sla_targets': 'deferred',
    'cao.data_quality_gates': 'deferred',
    'cao.adoption_rollout_governance': 'deferred',
    'cao.automation_candidates': 'standard',
    'cao.integrations_handoffs': 'deferred',
    'cao.followup_notifications': 'deferred',
    'cao.billing_quote_automation': 'deferred',
    'cao.ai_ops_guardrails': 'deferred',
    'cao.throughput': 'min',
    'cao.build_vs_buy': 'deferred',
    'cao.synthesis_bundle': 'deferred',
  },
  deep_audit: {
    'cao.process_map': 'max',
    'cao.sop_governance': 'standard',
    'cao.sla_targets': 'standard',
    'cao.data_quality_gates': 'standard',
    'cao.adoption_rollout_governance': 'standard',
    'cao.automation_candidates': 'max',
    'cao.integrations_handoffs': 'standard',
    'cao.followup_notifications': 'standard',
    'cao.billing_quote_automation': 'standard',
    'cao.ai_ops_guardrails': 'standard',
    'cao.throughput': 'standard',
    'cao.build_vs_buy': 'standard',
    'cao.synthesis_bundle': 'max',
  },
};

export function routeCaoAccessLevel(zoneStage: CaoZoneStage): CaoZoneStage {
  return zoneStage;
}

export function listCaoMvpAgentIds(): readonly CaoMvpSubAgentId[] {
  return [
    'cao.process_map',
    'cao.sop_governance',
    'cao.sla_targets',
    'cao.data_quality_gates',
    'cao.adoption_rollout_governance',
    'cao.automation_candidates',
    'cao.integrations_handoffs',
    'cao.followup_notifications',
    'cao.billing_quote_automation',
    'cao.ai_ops_guardrails',
    'cao.throughput',
    'cao.build_vs_buy',
    'cao.synthesis_bundle',
  ];
}
