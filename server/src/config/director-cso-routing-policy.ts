export type CsoDeepDiveCase = 'A_zero_knowledge' | 'B_regulated' | 'C_data_heavy' | 'D_incident';

export type CsoSubAgentDepth = 'min' | 'standard' | 'max' | 'deferred';

export type CsoSubAgentId =
  | 'cso.case_classifier'
  | 'cso.threat_model'
  | 'cso.compliance_map'
  | 'cso.attack_surface_map'
  | 'cso.risk_scoring'
  | 'cso.exploitability_exposure'
  | 'cso.metrics_framework'
  | 'cso.incident_readiness'
  | 'cso.sdlc_access_governance';

/**
 * Case-aware depth matrix for CSO R3 sub-agents.
 * Aligns with docs/instructions/CSO-INSTRUCTIONS.md case taxonomy.
 */
export const DIRECTOR_CSO_CASE_AGENT_DEPTHS: Record<CsoDeepDiveCase, Record<CsoSubAgentId, CsoSubAgentDepth>> = {
  A_zero_knowledge: {
    'cso.case_classifier': 'standard',
    'cso.threat_model': 'standard',
    'cso.compliance_map': 'min',
    'cso.attack_surface_map': 'standard',
    'cso.risk_scoring': 'standard',
    'cso.exploitability_exposure': 'min',
    'cso.metrics_framework': 'min',
    'cso.incident_readiness': 'deferred',
    'cso.sdlc_access_governance': 'deferred',
  },
  B_regulated: {
    'cso.case_classifier': 'max',
    'cso.threat_model': 'standard',
    'cso.compliance_map': 'max',
    'cso.attack_surface_map': 'standard',
    'cso.risk_scoring': 'max',
    'cso.exploitability_exposure': 'standard',
    'cso.metrics_framework': 'max',
    'cso.incident_readiness': 'standard',
    'cso.sdlc_access_governance': 'max',
  },
  C_data_heavy: {
    'cso.case_classifier': 'standard',
    'cso.threat_model': 'max',
    'cso.compliance_map': 'standard',
    'cso.attack_surface_map': 'max',
    'cso.risk_scoring': 'max',
    'cso.exploitability_exposure': 'max',
    'cso.metrics_framework': 'standard',
    'cso.incident_readiness': 'max',
    'cso.sdlc_access_governance': 'standard',
  },
  D_incident: {
    'cso.case_classifier': 'max',
    'cso.threat_model': 'max',
    'cso.compliance_map': 'standard',
    'cso.attack_surface_map': 'max',
    'cso.risk_scoring': 'max',
    'cso.exploitability_exposure': 'max',
    'cso.metrics_framework': 'standard',
    'cso.incident_readiness': 'max',
    'cso.sdlc_access_governance': 'standard',
  },
};

export function listCsoSubAgentIds(): readonly CsoSubAgentId[] {
  return [
    'cso.case_classifier',
    'cso.threat_model',
    'cso.compliance_map',
    'cso.attack_surface_map',
    'cso.risk_scoring',
    'cso.exploitability_exposure',
    'cso.metrics_framework',
    'cso.incident_readiness',
    'cso.sdlc_access_governance',
  ];
}

/**
 * Backward-compatible alias while CSO R3 transitions away from MVP naming.
 */
export type CsoMvpSubAgentId = CsoSubAgentId;

/**
 * Backward-compatible alias while CSO R3 transitions away from MVP naming.
 */
export function listCsoMvpAgentIds(): readonly CsoMvpSubAgentId[] {
  return listCsoSubAgentIds();
}
