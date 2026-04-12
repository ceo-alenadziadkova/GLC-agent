/**
 * CONTROL_OBJECT v1 — Governance contract between FactChecker and Decision Layer.
 *
 * This is the advisory-only v1 contract (Phase 1 MVP).
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
  system_version: 'v1.0',
  fact_checker_version: 'v1.0',
  decision_layer_version: 'v1.0',
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
}

export interface ControlObjectConfidence {
  /** Weighted aggregate of factual × strategic × consistency (0–100) */
  overall: number;
  /** How well facts align with BRIEF and collected data (0–100) */
  factual: number;
  /** How coherent the strategy/recommendations are (0–100) */
  strategic: number;
  /** How internally consistent the output is across sections (0–100) */
  consistency: number;
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
export interface ControlObjectAssumption {
  id: string;
  statement: string;
  /** Where this assumption came from */
  source: AssumptionSource;
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

export interface ControlObjectHumanAttention {
  required: boolean;
  /** Machine-readable reason codes */
  reasons: string[];
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
  counts: ControlObjectCounts;
  errors: ControlObjectErrors;
  assumptions: ControlObjectAssumption[];
  trace: ControlObjectTrace;
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
  executionMode: ExecutionMode = 'normal'
): ControlObjectV1 {
  return {
    versions: { ...CONTROL_OBJECT_VERSIONS },
    context: {
      audit_id: auditId,
      phase_id: phaseId,
      execution_mode: executionMode,
    },
    confidence: {
      overall: 100,
      factual: 100,
      strategic: 100,
      consistency: 100,
    },
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
    decision_hint: 'accept',
    human_attention_required: {
      required: false,
      reasons: [],
    },
  };
}
