import type { PhaseId, TruthSource } from './primitives.js';

export interface ControlObjectClaimSource {
  claim_id: number;
  agent: number;
  section: string;
  truth_source: TruthSource;
  truth_sources: TruthSource[];
}

export interface ControlObjectCausalClaimRef {
  phase_id: PhaseId;
  claim_id: number;
}

export interface ControlObjectCausalChainEntry {
  claim_id: number;
  depends_on: ControlObjectCausalClaimRef[];
}

export interface ControlObjectTrace {
  claim_sources: ControlObjectClaimSource[];
  causal_chain: ControlObjectCausalChainEntry[];
}
