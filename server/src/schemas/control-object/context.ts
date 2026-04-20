import type { ExecutionMode, GovernanceProfile, PhaseId } from './primitives.js';

export interface ControlObjectContext {
  audit_id: string;
  phase_id: PhaseId;
  execution_mode: ExecutionMode;
  truth_profile_id: string | null;
  /**
   * `full` — domain phases with claim buckets, feasibility, trace, etc.
   * `narrow` — recon/strategy-style governance without full claim graph (see ADR governance rule).
   * Omitted or `full` for backward compatibility with persisted CONTROL_OBJECT rows.
   */
  governance_profile?: GovernanceProfile;
  risk_profile?: 'low' | 'medium' | 'high' | 'enterprise' | null;
  selected_variant_id?: string;
  benchmark_reference_id?: string;
  structural_invalidation_claim_ids?: number[];
}
