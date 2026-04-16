import type {
  FixableErrorCode,
  HumanAttentionReasonCode,
  StructuralErrorCode,
} from '../../schemas/control-object.js';

// ─── Structural errors ────────────────────────────────────────────────────

export const STRUCTURAL_ERROR_SCORE_EVIDENCE_MISMATCH = 'score_evidence_mismatch' as const satisfies StructuralErrorCode;
export const STRUCTURAL_ERROR_UPSTREAM_CLAIM_INVALIDATED = 'upstream_claim_invalidated' as const satisfies StructuralErrorCode;

// ─── Fixable errors ───────────────────────────────────────────────────────

export const FIXABLE_ERROR_SCORE_CONSISTENCY_FLAG = 'score_consistency_flag' as const satisfies FixableErrorCode;
export const FIXABLE_ERROR_RISKY_PROMISE_LANGUAGE = 'risky_promise_language' as const satisfies FixableErrorCode;

// ─── Human attention reasons ──────────────────────────────────────────────

export const HUMAN_ATTENTION_HIGH_HALLUCINATION_COUNT = 'high_hallucination_count' as const satisfies HumanAttentionReasonCode;
export const HUMAN_ATTENTION_CRITICAL_DATA_GAPS = 'critical_data_gaps' as const satisfies HumanAttentionReasonCode;
export const HUMAN_ATTENTION_HIGH_RISK_ASSUMPTIONS = 'high_risk_assumptions' as const satisfies HumanAttentionReasonCode;
export const HUMAN_ATTENTION_CRITICALLY_LOW_FEASIBILITY = 'critically_low_feasibility' as const satisfies HumanAttentionReasonCode;
export const HUMAN_ATTENTION_EXTERNAL_SOURCE_UNAVAILABLE = 'external_source_unavailable' as const satisfies HumanAttentionReasonCode;
export const HUMAN_ATTENTION_UPSTREAM_CLAIM_INVALIDATED = 'upstream_claim_invalidated' as const satisfies HumanAttentionReasonCode;

