export type CsoDeepDiveCase = 'A_zero_knowledge' | 'B_regulated' | 'C_data_heavy' | 'D_incident';

export type CsoSubAgentDepth = 'min' | 'standard' | 'max' | 'deferred';

export type CsoMvpSubAgentId = 'cso.case_classifier' | 'cso.threat_model' | 'cso.compliance_map';

/**
 * Case-aware depth matrix for CSO MVP sub-agents (classifier → threat → compliance).
 * Aligns with docs/instructions/CSO-INSTRUCTIONS.md case taxonomy.
 */
export const DIRECTOR_CSO_CASE_AGENT_DEPTHS: Record<CsoDeepDiveCase, Record<CsoMvpSubAgentId, CsoSubAgentDepth>> = {
  A_zero_knowledge: {
    'cso.case_classifier': 'standard',
    'cso.threat_model': 'standard',
    'cso.compliance_map': 'min',
  },
  B_regulated: {
    'cso.case_classifier': 'max',
    'cso.threat_model': 'standard',
    'cso.compliance_map': 'max',
  },
  C_data_heavy: {
    'cso.case_classifier': 'standard',
    'cso.threat_model': 'max',
    'cso.compliance_map': 'standard',
  },
  D_incident: {
    'cso.case_classifier': 'max',
    'cso.threat_model': 'max',
    'cso.compliance_map': 'standard',
  },
};

export function listCsoMvpAgentIds(): readonly CsoMvpSubAgentId[] {
  return ['cso.case_classifier', 'cso.threat_model', 'cso.compliance_map'];
}
