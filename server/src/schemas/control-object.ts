/**
 * CONTROL_OBJECT v1 — Governance contract between FactChecker and Decision Layer.
 *
 * This is the advisory-only v1/v1.5/v1.7 contract (Phase 1–3 MVP).
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
  system_version: 'v1.7',
  fact_checker_version: 'v1.7',
  decision_layer_version: 'v1.7',
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
    },
  };
}
