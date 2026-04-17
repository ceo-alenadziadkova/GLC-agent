import type {
  FixableErrorCode,
  HumanAttentionReasonCode,
  StructuralErrorCode,
} from '../../schemas/control-object/index.js';
import {
  FIXABLE_ERROR_CODES,
  HUMAN_ATTENTION_REASON_CODES,
  STRUCTURAL_ERROR_CODES,
} from '../../schemas/control-object/index.js';

// ─── Structural errors ────────────────────────────────────────────────────

export const STRUCTURAL_ERROR_SCORE_EVIDENCE_MISMATCH =
  STRUCTURAL_ERROR_CODES.scoreEvidenceMismatch satisfies StructuralErrorCode;
export const STRUCTURAL_ERROR_UPSTREAM_CLAIM_INVALIDATED =
  STRUCTURAL_ERROR_CODES.upstreamClaimInvalidated satisfies StructuralErrorCode;

// ─── Fixable errors ───────────────────────────────────────────────────────

export const FIXABLE_ERROR_SCORE_CONSISTENCY_FLAG =
  FIXABLE_ERROR_CODES.scoreConsistencyFlag satisfies FixableErrorCode;
export const FIXABLE_ERROR_RISKY_PROMISE_LANGUAGE =
  FIXABLE_ERROR_CODES.riskyPromiseLanguage satisfies FixableErrorCode;

// ─── Human attention reasons ──────────────────────────────────────────────

export const HUMAN_ATTENTION_HIGH_HALLUCINATION_COUNT =
  HUMAN_ATTENTION_REASON_CODES.highHallucinationCount satisfies HumanAttentionReasonCode;
export const HUMAN_ATTENTION_CRITICAL_DATA_GAPS =
  HUMAN_ATTENTION_REASON_CODES.criticalDataGaps satisfies HumanAttentionReasonCode;
export const HUMAN_ATTENTION_HIGH_RISK_ASSUMPTIONS =
  HUMAN_ATTENTION_REASON_CODES.highRiskAssumptions satisfies HumanAttentionReasonCode;
export const HUMAN_ATTENTION_CRITICALLY_LOW_FEASIBILITY =
  HUMAN_ATTENTION_REASON_CODES.criticallyLowFeasibility satisfies HumanAttentionReasonCode;
export const HUMAN_ATTENTION_EXTERNAL_SOURCE_UNAVAILABLE =
  HUMAN_ATTENTION_REASON_CODES.externalSourceUnavailable satisfies HumanAttentionReasonCode;
export const HUMAN_ATTENTION_UPSTREAM_CLAIM_INVALIDATED =
  HUMAN_ATTENTION_REASON_CODES.upstreamClaimInvalidated satisfies HumanAttentionReasonCode;

