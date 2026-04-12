/**
 * CONTROL_OBJECT v1 — Governance contract between FactChecker and Decision Layer.
 *
 * This is the advisory-only v1/v1.5/v1.7/v1.8 contract (Phase 1–4 MVP).
 * Downstream services MUST NOT depend on this structure until v3+.
 *
 * Version history:
 *   v1.0  — Phase 1: versions, context, confidence, counts, errors, assumptions (light), trace, decision_hint
 *   v1.5  — Phase 2: truth_profile_id, assumptions.risk + related_claim_ids, truth_source per claim
 *   v1.7  — Phase 3: confidence.feasibility, confidence_weights, feasibility object
 *   v1.8  — Phase 4: safety mode guardrails, formalized error enums
 *   v2.0  — Phase 5: cost_control, agent_performance (full spec)
 */

import type { DomainKey } from '../types/audit.js';

// ─── Version ───────────────────────────────────────────────

export const CONTROL_OBJECT_VERSIONS = {
  system_version: 'v1.8',
  fact_checker_version: 'v1.8',
  decision_layer_version: 'v1.8',
} as const;

// ─── Core Types ────────────────────────────────────────────

export type DecisionHint = 'accept' | 'accept_with_warnings' | 'refine';
export type ExecutionMode = 'normal' | 'safe';
export type TruthSource = 'internal_metrics' | 'user_brief' | 'external_search';
export type AssumptionSource = 'inferred_from_brief' | 'inferred_from_pattern' | 'manual_input';

// Phase IDs align with DomainKey + recon/strategy
export type PhaseId = DomainKey | 'recon' | 'strategy';

// ─── Sub-schemas ───────────────────────────────────────────

export interface ControlObjectVersions {
  system_version: string;
  fact_checker_version: string;
  decision_layer_version: string;
}

export interface ControlObjectContext {
  audit_id: string;
  /** Domain phase (e.g. 'tech_infrastructure', 'security_compliance') */
  phase_id: PhaseId;
  /** 'normal' = standard run; 'safe' = stricter guardrails (Phase 4+) */
  execution_mode: ExecutionMode;
  /**
   * v1.5+: References the PHASE_PROFILES key used during this run.
   * null for recon/strategy phases (no profile defined).
   */
  truth_profile_id: string | null;
}

export interface ControlObjectConfidence {
  /** Weighted aggregate of all dimensions (0–100). v1.7+ uses phase-specific weights. */
  overall: number;
  /** How well facts align with BRIEF and collected data (0–100) */
  factual: number;
  /** How coherent the strategy/recommendations are (0–100) */
  strategic: number;
  /** How internally consistent the output is across sections (0–100) */
  consistency: number;
  /**
   * v1.7+: How realisable the recommendations are given brief constraints (0–100).
   * Derived from FeasibilityLayer.score × 100.
   * null until FeasibilityLayer has run (base phase agents that skip feasibility keep null).
   */
  feasibility: number | null;
}

/**
 * v1.7+: The weights used to compute confidence.overall for this phase.
 * Stored for auditability — allows downstream services to reproduce the score.
 */
export interface ControlObjectConfidenceWeights {
  factual: number;
  strategic: number;
  consistency: number;
  feasibility: number;
}

/**
 * v1.7+: Full feasibility assessment result embedded in CONTROL_OBJECT.
 * Mirrors FeasibilityResult from feasibility-layer.ts but import-free (self-contained schema).
 */
export interface ControlObjectFeasibility {
  /** 0.0–1.0 feasibility score */
  score: number;
  /** Machine-readable risk codes that reduced the score */
  risk_codes: string[];
  /** Human-readable risk descriptions */
  notes: string[];
}

export interface ControlObjectStatuses {
  confirmed_brief: number;
  unverified: number;
  likely_hallucination: number;
  risky_promise: number;
}

export interface ControlObjectCounts {
  total_claims: number;
  fact: number;
  strategic_hypothesis: number;
  opinion: number;
  assumption: number;
  statuses: ControlObjectStatuses;
}

export interface ControlObjectErrors {
  /** Fixable without rerun (tone, wording) — e.g. 'tone_overpromise', 'ambiguous_wording' */
  fixable: string[];
  /** Requires upstream rerun — e.g. 'positioning_conflict', 'audience_mismatch' */
  structural: string[];
  /** Missing data, model cannot fix — e.g. 'missing_pricing_data', 'uncertain_market_size' */
  data_gaps: string[];
}

/** v1: light assumptions (no risk/related_claim_ids — added in Phase 2) */
export interface ControlObjectAssumptionV1 {
  id: string;
  statement: string;
  /** Where this assumption came from */
  source: AssumptionSource;
}

/**
 * v1.5+: Full assumption with risk level and claim dependency tracking.
 * Extends v1 with risk and related_claim_ids (added in Phase 2).
 */
export interface ControlObjectAssumption extends ControlObjectAssumptionV1 {
  /**
   * Risk level: how dangerous is it if this assumption is wrong?
   * - 'low'   — obvious, documented, non-critical
   * - 'medium' — reasonable inference, not confirmed
   * - 'high'  — load-bearing assumption; if wrong, output is invalid
   */
  risk: 'low' | 'medium' | 'high';
  /**
   * IDs of claims that depend on this assumption being true.
   * Used in Phase 5+ to trace root causes during auto-loop.
   */
  related_claim_ids: number[];
}

export interface ControlObjectClaimSource {
  claim_id: number;
  agent: number;
  section: string;
  /** Which source provided the evidence for this claim */
  truth_source: TruthSource;
}

export interface ControlObjectTrace {
  claim_sources: ControlObjectClaimSource[];
}

// ─── v1.8: Formalized error enums ─────────────────────────────────────────────

/**
 * Fixable error codes — can be addressed without full rerun (tone, wording, score calibration).
 * Free-form strings allowed for domain-specific values not yet in this enum.
 */
export type FixableErrorCode =
  | 'score_consistency_flag'
  | 'risky_promise_language'
  | 'forbidden_absolutes'
  | 'missing_hypothesis_labels'
  | 'ambiguous_wording'
  | 'tone_overpromise'
  | string; // open for domain-specific codes

/**
 * Structural error codes — require upstream rerun to resolve.
 * Free-form strings allowed for domain-specific values.
 */
export type StructuralErrorCode =
  | 'score_evidence_mismatch'
  | 'positioning_conflict'
  | 'audience_mismatch'
  // tech_infrastructure
  | 'infra_unverified_capacity'
  | 'infra_unrealistic_timeline'
  | 'infra_undocumented_dependency'
  | 'infra_missing_monitoring_evidence'
  // security_compliance
  | 'security_overclaim'
  | 'compliance_unverified'
  | 'data_policy_mismatch'
  | 'access_control_gap'
  | 'missing_security_evidence'
  // seo_digital
  | 'seo_unverified_traffic_figure'
  | 'seo_keyword_demand_unsubstantiated'
  | 'seo_missing_crawl_evidence'
  | 'seo_competitor_claim_unverified'
  // ux_conversion
  | 'ux_conversion_figure_unverified'
  | 'ux_benchmark_unsubstantiated'
  | 'ux_a11y_claim_unchecked'
  | 'ux_missing_analytics_evidence'
  // marketing_utp
  | 'marketing_market_size_unverified'
  | 'marketing_competitor_claim_unsourced'
  | 'marketing_audience_assumption_unstated'
  | 'marketing_roi_figure_speculative'
  // automation_processes
  | 'automation_time_saving_speculative'
  | 'automation_tool_capability_unverified'
  | 'automation_integration_complexity_underestimated'
  | 'automation_roi_timeline_unrealistic'
  | string; // open for future codes

/** Human-attention reason codes — machine-readable escalation triggers. */
export type HumanAttentionReasonCode =
  | 'high_hallucination_count'
  | 'critical_data_gaps'
  | 'high_risk_assumptions'
  | 'critically_low_feasibility'
  // v1.8 safe-mode codes
  | 'safe_mode_too_many_risky_promises'
  | 'safe_mode_too_many_hallucinations'
  | 'safe_mode_high_unverified_fraction'
  | 'safe_mode_forbidden_absolutes_detected'
  | 'safe_mode_missing_hypothesis_labels'
  | string; // open for future codes

export interface ControlObjectHumanAttention {
  required: boolean;
  /** Machine-readable reason codes (see HumanAttentionReasonCode) */
  reasons: HumanAttentionReasonCode[];
  /**
   * v1.8+: Whether execution-mode guardrails were satisfied.
   * - true  = all safe-mode checks passed (or execution_mode is 'normal')
   * - false = one or more safe-mode violations were detected
   * - null  = not yet evaluated (pre-Phase 4 runs or recon/strategy phases)
   */
  requirements_met: boolean | null;
}

// ─── Top-level Contract ────────────────────────────────────

/**
 * CONTROL_OBJECT v1 — minimal, advisory governance contract.
 *
 * Emitted as a pipeline_event (event_type: 'control_object') after each phase.
 * The Decision Layer reads this to route: accept / accept_with_warnings / refine.
 */
export interface ControlObjectV1 {
  versions: ControlObjectVersions;
  context: ControlObjectContext;
  confidence: ControlObjectConfidence;
  /**
   * v1.7+: Weights used to compute confidence.overall for this phase.
   * null for phases that use the legacy simple-average formula (recon/strategy).
   */
  confidence_weights: ControlObjectConfidenceWeights | null;
  counts: ControlObjectCounts;
  errors: ControlObjectErrors;
  assumptions: ControlObjectAssumption[];
  trace: ControlObjectTrace;
  /**
   * v1.7+: Feasibility assessment result.
   * null until FeasibilityLayer has run (recon/strategy phases always null).
   */
  feasibility: ControlObjectFeasibility | null;
  decision_hint: DecisionHint;
  human_attention_required: ControlObjectHumanAttention;
}

// ─── Factory ───────────────────────────────────────────────

/**
 * Creates an empty CONTROL_OBJECT v1 shell with safe defaults.
 * Populate fields incrementally in FactChecker.buildControlObject().
 */
export function createControlObjectV1(
  auditId: string,
  phaseId: PhaseId,
  executionMode: ExecutionMode = 'normal',
  truthProfileId: string | null = null
): ControlObjectV1 {
  return {
    versions: { ...CONTROL_OBJECT_VERSIONS },
    context: {
      audit_id: auditId,
      phase_id: phaseId,
      execution_mode: executionMode,
      truth_profile_id: truthProfileId,
    },
    confidence: {
      overall: 100,
      factual: 100,
      strategic: 100,
      consistency: 100,
      feasibility: null,
    },
    confidence_weights: null,
    counts: {
      total_claims: 0,
      fact: 0,
      strategic_hypothesis: 0,
      opinion: 0,
      assumption: 0,
      statuses: {
        confirmed_brief: 0,
        unverified: 0,
        likely_hallucination: 0,
        risky_promise: 0,
      },
    },
    errors: {
      fixable: [],
      structural: [],
      data_gaps: [],
    },
    assumptions: [],
    trace: {
      claim_sources: [],
    },
    feasibility: null,
    decision_hint: 'accept',
    human_attention_required: {
      required: false,
      reasons: [],
      requirements_met: null,
    },
  };
}
