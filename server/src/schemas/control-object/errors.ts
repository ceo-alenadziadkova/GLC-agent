export interface ControlObjectErrors {
  fixable: string[];
  structural: string[];
  data_gaps: string[];
}

export const FIXABLE_ERROR_CODES = {
  scoreConsistencyFlag: 'score_consistency_flag',
  riskyPromiseLanguage: 'risky_promise_language',
  forbiddenAbsolutes: 'forbidden_absolutes',
  missingHypothesisLabels: 'missing_hypothesis_labels',
  ambiguousWording: 'ambiguous_wording',
  toneOverpromise: 'tone_overpromise',
} as const;

export type FixableErrorCode =
  | 'score_consistency_flag'
  | 'risky_promise_language'
  | 'forbidden_absolutes'
  | 'missing_hypothesis_labels'
  | 'ambiguous_wording'
  | 'tone_overpromise'
  | string;

export type StructuralErrorCode =
  | 'score_evidence_mismatch'
  | 'positioning_conflict'
  | 'audience_mismatch'
  | 'infra_unverified_capacity'
  | 'infra_unrealistic_timeline'
  | 'infra_undocumented_dependency'
  | 'infra_missing_monitoring_evidence'
  | 'security_overclaim'
  | 'compliance_unverified'
  | 'data_policy_mismatch'
  | 'access_control_gap'
  | 'missing_security_evidence'
  | 'seo_unverified_traffic_figure'
  | 'seo_keyword_demand_unsubstantiated'
  | 'seo_missing_crawl_evidence'
  | 'seo_competitor_claim_unverified'
  | 'ux_conversion_figure_unverified'
  | 'ux_benchmark_unsubstantiated'
  | 'ux_a11y_claim_unchecked'
  | 'ux_missing_analytics_evidence'
  | 'marketing_market_size_unverified'
  | 'marketing_competitor_claim_unsourced'
  | 'marketing_audience_assumption_unstated'
  | 'marketing_roi_figure_speculative'
  | 'automation_time_saving_speculative'
  | 'automation_tool_capability_unverified'
  | 'automation_integration_complexity_underestimated'
  | 'automation_roi_timeline_unrealistic'
  | 'upstream_claim_invalidated'
  | string;

export const STRUCTURAL_ERROR_CODES = {
  scoreEvidenceMismatch: 'score_evidence_mismatch',
  upstreamClaimInvalidated: 'upstream_claim_invalidated',
} as const;

export type HumanAttentionReasonCode =
  | 'high_hallucination_count'
  | 'critical_data_gaps'
  | 'high_risk_assumptions'
  | 'critically_low_feasibility'
  | 'safe_mode_too_many_risky_promises'
  | 'safe_mode_too_many_hallucinations'
  | 'safe_mode_high_unverified_fraction'
  | 'safe_mode_forbidden_absolutes_detected'
  | 'safe_mode_missing_hypothesis_labels'
  | 'external_source_unavailable'
  | 'content_remediation_blocked_by_phase_profile'
  | 'upstream_claim_invalidated'
  | string;

export const HUMAN_ATTENTION_REASON_CODES = {
  highHallucinationCount: 'high_hallucination_count',
  criticalDataGaps: 'critical_data_gaps',
  highRiskAssumptions: 'high_risk_assumptions',
  criticallyLowFeasibility: 'critically_low_feasibility',
  externalSourceUnavailable: 'external_source_unavailable',
  upstreamClaimInvalidated: 'upstream_claim_invalidated',
  contentRemediationBlockedByPhaseProfile: 'content_remediation_blocked_by_phase_profile',
} as const;

export const HUMAN_ATTENTION_CONTENT_REMEDIATION_BLOCKED: HumanAttentionReasonCode =
  HUMAN_ATTENTION_REASON_CODES.contentRemediationBlockedByPhaseProfile;

export interface ControlObjectHumanAttention {
  required: boolean;
  reasons: HumanAttentionReasonCode[];
  requirements_met: boolean | null;
}
