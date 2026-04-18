export interface ReviewPoint {
  id: string;
  audit_id: string;
  after_phase: number;
  status: 'pending' | 'approved';
  consultant_notes: string | null;
  interview_notes: string | null;
  approved_at: string | null;
}

export interface PipelineEvent {
  id: number;
  audit_id: string;
  phase: number;
  event_type: string;
  message: string | null;
  data: Record<string, unknown>;
  created_at: string;
}

export interface QualityFlag {
  id: string;
  /** 'warning' — must acknowledge before approving; 'info' — informational only */
  severity: 'warning' | 'info';
  domain_key: string | null;
  rule: string;
  message: string;
}

export interface QualityGateReport {
  /** True when there are no 'warning'-level flags */
  passed: boolean;
  flags: QualityFlag[];
  checked_at: string;
}

/** Decision Layer output persisted on CONTROL_OBJECT v1 and in `refine_recommended` events. */
export type GovernanceDecisionHint = 'accept' | 'accept_with_warnings' | 'refine';

/** Subset of CONTROL_OBJECT v1 used for consultant UI (from `pipeline_events.data.control_object`). */
export interface ControlObjectGovernanceView {
  decision_hint: GovernanceDecisionHint;
  confidence: {
    overall: number;
    factual: number;
    strategic: number;
    consistency: number;
  };
  counts: {
    total_claims: number;
    fact: number;
    statuses: {
      confirmed_brief: number;
      confirmed_external?: number;
      unverified: number;
      likely_hallucination: number;
      risky_promise: number;
      dependent_on_brief_assumption?: number;
      strategic_inconsistency?: number;
    };
  };
  context: {
    phase_id: string;
    execution_mode: string;
    audit_id: string;
  };
  human_attention_required: {
    required: boolean;
    reasons: string[];
  };
  /** Phase 9: number of auto-remediation actions applied before this control_object was emitted. */
  auto_remediation_applied_count?: number;
}

/** `pipeline_events.data` for `event_type === 'refine_recommended'`. */
export interface RefineRecommendedEventData {
  decision_hint: GovernanceDecisionHint;
  reasoning: string;
  active_error_types: string[];
  control_object?: ControlObjectGovernanceView;
}
