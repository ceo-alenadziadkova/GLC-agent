/**
 * CONTROL_OBJECT v2.1 — Formal governance contract between FactChecker and Decision Layer.
 *
 * From v2.0 onward this is a FORMAL CONTRACT. Any service reading CONTROL_OBJECT fields
 * must annotate its code: // CO-CONSUMER: update when CO schema changes
 *
 * Version history:
 *   v1.0  — Phase 1: versions, context, confidence, counts, errors, assumptions (light), trace, decision_hint
 *   v1.5  — Phase 2: truth_profile_id, assumptions.risk + related_claim_ids, truth_source per claim
 *   v1.7  — Phase 3: confidence.feasibility, confidence_weights, feasibility object
 *   v1.8  — Phase 4: safety mode guardrails, formalized error enums
 *   v2.0  — Phase 5: cost_control, agent_performance (full spec)
 *   v2.1  — Sprint 1–2: risk_profile, evaluation_link, selected_variant_id (bandits),
 *            external_api/document_feed truth tiers (registry: api before generic search),
 *            causal_chain pre-declaration, external_source_unavailable reason code,
 *            accept_with_warnings formalised (already in DecisionHint since v1.7)
 *   v2.3  — Phase 8 (Sprint 4): causal_chain + audit_claim_graph when FEATURE_CAUSAL_DAG=true
 *   v2.4  — Phase 9 (planned): auto-remediation annotations
 *   v2.5  — Phase 10 (planned): context.benchmark_reference_id
 *
 * See docs/adrs/ADR-CONTROL-OBJECT-V2-FULL.md for full schema specification.
 */

import type { DomainKey } from '../types/audit.js';

// ─── Version ───────────────────────────────────────────────

export const CONTROL_OBJECT_VERSIONS = {
  system_version: 'v2.1',
  fact_checker_version: 'v2.1',
  decision_layer_version: 'v2.1',
} as const;

/** Emitted when FEATURE_CAUSAL_DAG is active for a domain phase run (Phase 8). */
export const CONTROL_OBJECT_VERSIONS_CAUSAL_DAG = {
  system_version: 'v2.3',
  fact_checker_version: 'v2.3',
  decision_layer_version: 'v2.1',
} as const;

/** After Phase 9 auto-remediation applied at least one fix in this run. */
export const CONTROL_OBJECT_VERSIONS_REMEDIATION = {
  system_version: 'v2.4',
  fact_checker_version: 'v2.4',
  decision_layer_version: 'v2.1',
} as const;

// ─── Core Types ────────────────────────────────────────────

export type DecisionHint = 'accept' | 'accept_with_warnings' | 'refine';
export type ExecutionMode = 'normal' | 'safe';
export type TruthSource =
  | 'internal_metrics'  // priority 1 — system-observed data
  | 'user_brief'        // priority 2 — explicitly provided by client
  | 'external_api'      // priority 3 — authoritative structured API (Phase 7+)
  | 'external_search'   // priority 4 — general web search
  | 'document_feed';    // priority 5 — client-uploaded documents (Phase 7+)
export type AssumptionSource =
  | 'inferred_from_brief'
  | 'inferred_from_pattern'
  | 'manual_input'
  | 'external_data';    // v2.1: assumption sourced from external data connector

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
  /**
   * v2.1+: Risk classification for this audit context.
   * Enables Decision Layer to apply stricter thresholds for enterprise/compliance-heavy contexts.
   * null = not classified (treated as 'medium' by default).
   */
  risk_profile?: 'low' | 'medium' | 'high' | 'enterprise' | null;
  /**
   * v2.1+: Bandit-selected agent variant for this run (`default` or registered id).
   * Set by pipeline when the domain phase runs; omitted when unknown.
   */
  selected_variant_id?: string;
  /**
   * v2.5+: Reference to the benchmark snapshot used for percentile reporting (Phase 10+).
   * undefined = benchmarks not yet computed for this phase+industry combination.
   */
  benchmark_reference_id?: string;
  /**
   * v2.3+: Claim indices (1-based, issue order) in this phase that triggered structural governance.
   * Used by the pipeline to seed causal downstream invalidation in audit_claim_graph.
   */
  structural_invalidation_claim_ids?: number[];
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
  /**
   * Claims whose winning truth tier is external_api or document_feed (connector or feed confirmed).
   */
  confirmed_external: number;
  unverified: number;
  likely_hallucination: number;
  risky_promise: number;
  /**
   * Fact claims that cite the client brief as source but remain low-confidence (load-bearing brief dependency).
   */
  dependent_on_brief_assumption: number;
  /**
   * Count of structural error codes that indicate cross-section or positioning inconsistency (keyword heuristic).
   */
  strategic_inconsistency: number;
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
  /** Winning source after priority-based merge (lowest registry priority number wins). */
  truth_source: TruthSource;
  /**
   * All contributing tiers observed for this claim (deduped, sorted strongest-first).
   * v2.1+: supports multi-modal traces; `truth_source` remains the canonical winner for backward compatibility.
   */
  truth_sources: TruthSource[];
}

/**
 * v2.3+: Reference to a claim produced in a specific pipeline phase (claim_id is 1-based within that phase's CONTROL_OBJECT).
 */
export interface ControlObjectCausalClaimRef {
  phase_id: PhaseId;
  claim_id: number;
}

/**
 * v2.3+: Single entry in a cross-phase causal dependency chain (Phase 8 — ADR-CAUSAL-DAG.md).
 * Each premise carries its phase_id so dependencies across multiple upstream phases are unambiguous.
 */
export interface ControlObjectCausalChainEntry {
  /** The dependent claim in the current phase (1-based issue index). */
  claim_id: number;
  /** Premise claims from strictly earlier phases that this claim relies on. */
  depends_on: ControlObjectCausalClaimRef[];
}

export interface ControlObjectTrace {
  claim_sources: ControlObjectClaimSource[];
  /**
   * v2.1+: Pre-declared; always [] until Phase 8 activates FEATURE_CAUSAL_DAG.
   * v2.3+: Required. Cross-phase claim dependency graph.
   * See docs/adrs/ADR-CAUSAL-DAG.md
   */
  causal_chain: ControlObjectCausalChainEntry[];
}

/**
 * v2.1+: Links this CONTROL_OBJECT to its evaluation_dataset row for cross-run analysis.
 */
export interface ControlObjectEvaluationLink {
  /** UUID of the evaluation_dataset row for this run */
  evaluation_id: string;
  /** Schema version of the evaluation_dataset table at write time */
  dataset_version: string;
}

/** v2.4: Auto-remediation summary (Phase 9). */
export interface ControlObjectAutoRemediation {
  applied: Array<{
    error_type: string;
    remediation_type: 'tone' | 'content';
  }>;
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
  // Phase 8 causal DAG
  | 'upstream_claim_invalidated'
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
  // v2.1 codes
  | 'external_source_unavailable'            // high-risk claim could not be checked; connector timed out/errored
  | 'content_remediation_blocked_by_phase_profile' // Phase 9: auto-remediation limited to tone_only for this phase
  | 'upstream_claim_invalidated'             // Phase 8: a downstream claim depends on an invalidated upstream claim
  | string; // open for domain-specific codes

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

// ─── v2.0: Cost Control ────────────────────────────────────

/**
 * v2.0+: Token cost tracking for this phase run (and any reruns).
 * Enables the cost guardrail in auto-loop: skip rerun if cost > threshold AND gain < min.
 */
export interface ControlObjectCostControl {
  /**
   * Estimated USD cost of the primary Claude call for this phase.
   * Derived from token counts × MODEL pricing. null if not tracked.
   */
  estimated_cost_usd: number | null;
  /**
   * Total estimated USD cost including any auto-loop reruns.
   * null until at least one rerun has been attempted.
   */
  total_rerun_cost_usd: number | null;
  /**
   * Number of auto-loop rerun iterations performed for this phase (0 = no reruns).
   */
  rerun_count: number;
  /**
   * Whether the cost guardrail blocked a rerun.
   * false = guard not triggered; true = rerun was skipped due to cost ceiling.
   */
  cost_guardrail_triggered: boolean;
}

// ─── v2.0: Agent Performance ───────────────────────────────

/**
 * v2.0+: Per-run agent performance snapshot embedded in CONTROL_OBJECT.
 * Mirrors AgentPerformanceMetrics from agent-performance.ts.
 * Stored for per-run observability — aggregation happens async in agent_performance_aggregate.
 */
export interface ControlObjectAgentPerformance {
  agent_number: number;
  hallucination_rate: number;
  risky_promise_rate: number;
  unverified_rate: number;
  inconsistency_rate: number;
  /** Composite 0.0–1.0 score for this run */
  agent_score: number;
  /** Whether this score meets the minimum evaluation count threshold for reliability */
  score_reliable: boolean;
}

// ─── Top-level Contract ────────────────────────────────────

/**
 * CONTROL_OBJECT v2.1 — formal governance contract (Phase 5+).
 *
 * Emitted as a pipeline_event (event_type: 'control_object') after each phase.
 * The Decision Layer reads this to route: accept / accept_with_warnings / refine.
 *
 * CO-CONSUMER: update when CO schema changes
 * Known consumers: decision-layer.ts, pipeline.ts, dynamic-adjustment.ts,
 * agent-performance.ts, evaluation-dataset-writer.ts, PipelineMonitor (frontend)
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
  /**
   * v2.0+: Token cost tracking for this run + any auto-loop reruns.
   * null until auto-loop infrastructure activates (Phase 5+).
   */
  cost_control: ControlObjectCostControl | null;
  /**
   * v2.0+: Agent performance metrics snapshot for this run.
   * null for recon/strategy phases or if performance scoring was skipped.
   */
  agent_performance: ControlObjectAgentPerformance | null;
  /**
   * v2.1+: Links this CO to its evaluation_dataset row for cross-run analysis.
   * null until EvaluationDatasetWriter records the row and sets the link.
   */
  evaluation_link: ControlObjectEvaluationLink | null;
  /**
   * v2.4: Populated when RemediationService applied one or more deterministic output fixes.
   */
  auto_remediation?: ControlObjectAutoRemediation | null;
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
      risk_profile: null,
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
        confirmed_external: 0,
        unverified: 0,
        likely_hallucination: 0,
        risky_promise: 0,
        dependent_on_brief_assumption: 0,
        strategic_inconsistency: 0,
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
      causal_chain: [], // pre-declared in v2.1; activated in Phase 8 (ADR-CAUSAL-DAG.md)
    },
    feasibility: null,
    cost_control: null,
    agent_performance: null,
    evaluation_link: null,
    decision_hint: 'accept',
    human_attention_required: {
      required: false,
      reasons: [],
      requirements_met: null,
    },
  };
}
