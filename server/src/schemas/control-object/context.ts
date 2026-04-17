import type { ExecutionMode, PhaseId } from './primitives.js';

export interface ControlObjectContext {
  audit_id: string;
  phase_id: PhaseId;
  execution_mode: ExecutionMode;
  truth_profile_id: string | null;
  risk_profile?: 'low' | 'medium' | 'high' | 'enterprise' | null;
  selected_variant_id?: string;
  benchmark_reference_id?: string;
  structural_invalidation_claim_ids?: number[];
}
