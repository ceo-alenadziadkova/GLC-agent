/**
 * Policy for the Collaborative Director Protocol (concept ADR:
 * `ADR-CROSS-DIRECTOR-COLLABORATIVE-STRATEGY-V1.md`).
 *
 * Single source of truth for:
 *   - schema versioning
 *   - hypothesis / reaction / conflict cardinality caps
 *   - token budget split across coalition phases
 *   - GA gate thresholds
 *   - constraint→domain_weights and mode→domain_priority lookups
 *   - degrade-path policy
 *
 * Services and prompts MUST read these constants from this module — never inline
 * literal numbers / strings / lookup tables in services or routes
 * (`docs/ARCHITECTURE.md` § Strict layer boundaries; `.cursor/rules/no-hardcode.mdc`).
 */

import type { DomainKey } from '@glc/intake-core';
import { DOMAIN_KEYS } from '@glc/intake-core';

// ----------------------------------------------------------------------------
// Schema versioning
// ----------------------------------------------------------------------------

/** Bump in lockstep with breaking changes to ClientSituationSnapshot Zod. */
export const COALITION_CLIENT_SITUATION_SCHEMA_VERSION = 1 as const;

/** Bump in lockstep with breaking changes to DomainHypothesisDraft Zod. */
export const COALITION_HYPOTHESIS_SCHEMA_VERSION = 1 as const;

/** Bump in lockstep with breaking changes to DomainAlignmentResponse Zod. */
export const COALITION_ALIGNMENT_SCHEMA_VERSION = 1 as const;

/** Bump in lockstep with breaking changes to CrossDomainConflictResolution Zod. */
export const COALITION_CONFLICT_RESOLUTION_SCHEMA_VERSION = 1 as const;

// ----------------------------------------------------------------------------
// Cardinality caps (output volume)
// ----------------------------------------------------------------------------

/** Phase 1: per-domain hypothesis cardinality. */
export const COALITION_MIN_HYPOTHESES_PER_DOMAIN = 3 as const;
export const COALITION_MAX_HYPOTHESES_PER_DOMAIN = 7 as const;

/** Phase 1: per-hypothesis evidence_refs cap (each ref ≤ 500 chars elsewhere). */
export const COALITION_MAX_EVIDENCE_REFS_PER_HYPOTHESIS = 5 as const;

/** Phase 1: per-domain raised_questions cap. */
export const COALITION_MAX_RAISED_QUESTIONS_PER_DOMAIN = 5 as const;

/** Phase 2: per-peer reaction cap (forces directors to stay focused on highest-signal pairs). */
export const COALITION_MAX_REACTIONS_PER_PEER = 5 as const;

/** Phase 2: total reactions cap per domain (across all 5 peers). */
export const COALITION_MAX_TOTAL_REACTIONS_PER_DOMAIN = 18 as const;

/** Phase 2: total self_corrections cap per domain. */
export const COALITION_MAX_SELF_CORRECTIONS_PER_DOMAIN = 5 as const;

/** Phase 3: resolved_conflicts cap (single resolver call). */
export const COALITION_MAX_RESOLVED_CONFLICTS = 12 as const;

/** Phase 3: unresolved cap (escalation queue size). */
export const COALITION_MAX_UNRESOLVED_CONFLICTS = 6 as const;

/** Phase 0.5: assumptions and clarifying_questions caps on the snapshot. */
export const COALITION_MAX_SNAPSHOT_ASSUMPTIONS = 8 as const;
export const COALITION_MAX_SNAPSHOT_CLARIFYING_QUESTIONS = 6 as const;

// ----------------------------------------------------------------------------
// Token budget knobs (extends the existing TokenBudget mechanism)
// ----------------------------------------------------------------------------

/**
 * Total token cap for the coalition flow (Phase 0.5 + 1 + 2 + 3) per audit.
 * Hard ceiling — once exceeded, the orchestrator triggers the degrade path
 * (see `coalitionDegradeStepFor` below).
 */
export const COALITION_TOTAL_TOKEN_CAP = 180_000 as const;

/** Per-phase token caps. Sum should be ≤ COALITION_TOTAL_TOKEN_CAP. */
export const COALITION_PHASE_TOKEN_CAPS = {
  context_director: 20_000,
  hypothesis_per_domain: 16_000, // ×6 = 96_000
  alignment_per_domain: 8_000,   // ×6 = 48_000
  conflict_resolver: 16_000,
} as const;

/** Coalition phases that should defer to legacy domain prompt on degrade. */
export const COALITION_DEGRADE_FALLBACK_DOMAINS_ALL: readonly DomainKey[] = DOMAIN_KEYS;

/**
 * Degrade-path step ordering: when token usage or per-domain LLM failures cross
 * a threshold, services apply these steps in order.
 *
 * 1. trim_hypotheses        — drop hypotheses below `confidence='high'` until
 *                             the domain hits MIN_HYPOTHESES_PER_DOMAIN.
 * 2. trim_reactions         — drop alignment reactions other than 'blocks'
 *                             and 'contradicts' (highest signal kept).
 * 3. degrade_to_legacy      — for the affected domain only, fall back to the
 *                             legacy `<domain>.md` prompt for finalize and
 *                             persist `analysis_mode='collaboration_degraded'`.
 */
export const COALITION_DEGRADE_STEPS = [
  'trim_hypotheses',
  'trim_reactions',
  'degrade_to_legacy',
] as const;
export type CoalitionDegradeStep = (typeof COALITION_DEGRADE_STEPS)[number];

/** Selects the next degrade step given how many have already been applied. */
export function coalitionDegradeStepFor(applied: number): CoalitionDegradeStep | null {
  return COALITION_DEGRADE_STEPS[applied] ?? null;
}

// ----------------------------------------------------------------------------
// GA gate thresholds (concept ADR §Governance gates)
// ----------------------------------------------------------------------------

export const COALITION_GA_GATES = {
  /** Median Initiative.cross_domain_dependencies.length per Strategy. */
  crossDomainDensityMedianMin: 1.5,

  /** Share of audits with audit_conflict_resolutions.unresolved.length > 0. */
  unresolvedConflictRateMax: 0.15,

  /**
   * Share of audits where every Phase-4 finalize bundle reflects the snapshot's
   * strategic_mode. Authoritative target: 100% (no drift allowed past internal).
   */
  modeAlignmentMin: 1.0,

  /** Share of confidence='low' hypotheses linked to a clarifying_question. */
  assumptionCoverageMin: 0.8,

  /** Share of Approve-Coalition gates closed without consultant override. */
  consultantAgreementMin: 0.75,

  /** Added p95 wall-clock for coalition phases (seconds). */
  runtimeOverheadP95SecMax: 60,

  /** Added p95 token cost vs legacy pipeline (fraction). */
  tokenOverheadP95Max: 0.3,
} as const;

/** Number of consecutive 7-day windows the gates must remain green for promotion. */
export const COALITION_GA_PROMOTION_WINDOW_COUNT = 2 as const;
export const COALITION_GA_PROMOTION_WINDOW_DAYS = 7 as const;

/** Maximum auto-loop runs of Phase 0.5 (Context Director) per audit. V1 only. */
export const COALITION_AUTO_LOOP_MAX_RUNS = 2 as const;

// ----------------------------------------------------------------------------
// Vocabularies (closed enums shared with Zod schemas)
// ----------------------------------------------------------------------------

export const COALITION_ENTITY_TYPES = [
  'pre_product_idea',
  'mvp',
  'growth_stage',
  'scale',
  'personal_brand',
  'b2b_saas',
  'b2c_product',
  'service_business',
  'marketplace',
  'ecommerce',
  'content_media',
] as const;
export type CoalitionEntityType = (typeof COALITION_ENTITY_TYPES)[number];

export const COALITION_DOMINANT_CONSTRAINTS = [
  'traffic',
  'conversion',
  'tech',
  'risk',
  'delivery',
] as const;
export type CoalitionDominantConstraint = (typeof COALITION_DOMINANT_CONSTRAINTS)[number];

export const COALITION_STRATEGIC_MODES = [
  'discovery',
  'launch',
  'growth',
  'authority',
  'defense',
] as const;
export type CoalitionStrategicMode = (typeof COALITION_STRATEGIC_MODES)[number];

export const COALITION_MATURITY_TIERS = [
  'exploratory',
  'actionable',
  'optimization',
] as const;
export type CoalitionMaturityTier = (typeof COALITION_MATURITY_TIERS)[number];

export const COALITION_HYPOTHESIS_TYPES = [
  'risk',
  'opportunity',
  'lever',
  'constraint',
] as const;
export type CoalitionHypothesisType = (typeof COALITION_HYPOTHESIS_TYPES)[number];

export const COALITION_REACTION_RELATIONS = [
  'acknowledges',
  'blocks',
  'depends_on',
  'enables',
  'duplicates',
  'contradicts',
] as const;
export type CoalitionReactionRelation = (typeof COALITION_REACTION_RELATIONS)[number];

export const COALITION_SELF_CORRECTION_KINDS = [
  'reformulate',
  'lower_confidence',
  'merge',
  'drop',
  'split',
] as const;
export type CoalitionSelfCorrectionKind = (typeof COALITION_SELF_CORRECTION_KINDS)[number];

export const COALITION_CONFLICT_TYPES = [
  'sequencing',
  'tradeoff',
  'mode_misalignment',
  'duplicate',
  'capacity',
  'compliance_boundary',
] as const;
export type CoalitionConflictType = (typeof COALITION_CONFLICT_TYPES)[number];

export const COALITION_RESOLUTION_KINDS = [
  'sequenced',
  'merged',
  'phased',
  'deferred',
  'escalated_to_consultant',
] as const;
export type CoalitionResolutionKind = (typeof COALITION_RESOLUTION_KINDS)[number];

export const COALITION_ACTION_CONSTRAINTS = [
  'must_precede',
  'must_follow',
  'parallel_ok',
  'merged_with',
  'dropped',
] as const;
export type CoalitionActionConstraint = (typeof COALITION_ACTION_CONSTRAINTS)[number];

export const COALITION_UNRESOLVED_RECOMMENDED_ACTIONS = [
  'escalate',
  'defer',
  'gather_data',
] as const;
export type CoalitionUnresolvedRecommendedAction = (typeof COALITION_UNRESOLVED_RECOMMENDED_ACTIONS)[number];

// ----------------------------------------------------------------------------
// Routing: dominant_constraint → primary domains
// ----------------------------------------------------------------------------

/**
 * Each dominant_constraint elects a primary domain (weight 2.0) and a
 * secondary domain (weight 1.5). Other domains keep weight 1.0 unless overridden
 * by `MODE_DOMAIN_PRIORITY_OVERRIDES`.
 *
 * Why these pairs:
 *  - traffic    → CMO drives, SEO supports.
 *  - conversion → CDO drives, CMO supports (message-CTA fit).
 *  - tech       → CTO drives, Automation supports (broken pipes block ops).
 *  - risk       → CSO drives, CTO supports (controls live in infra).
 *  - delivery   → CAO drives, CTO supports (ops throughput depends on infra).
 */
export const CONSTRAINT_PRIMARY_DOMAIN: Readonly<Record<CoalitionDominantConstraint, DomainKey>> = {
  traffic: 'marketing_utp',
  conversion: 'ux_conversion',
  tech: 'tech_infrastructure',
  risk: 'security_compliance',
  delivery: 'automation_processes',
};

export const CONSTRAINT_SECONDARY_DOMAIN: Readonly<Record<CoalitionDominantConstraint, DomainKey>> = {
  traffic: 'seo_digital',
  conversion: 'marketing_utp',
  tech: 'automation_processes',
  risk: 'tech_infrastructure',
  delivery: 'tech_infrastructure',
};

export const COALITION_DOMAIN_WEIGHT_PRIMARY = 2.0 as const;
export const COALITION_DOMAIN_WEIGHT_SECONDARY = 1.5 as const;
export const COALITION_DOMAIN_WEIGHT_DEFAULT = 1.0 as const;
export const COALITION_DOMAIN_WEIGHT_DORMANT = 0.5 as const;

/**
 * Per-mode overrides. When a strategic_mode is selected, certain domains are
 * pulled toward dormant or boosted regardless of the constraint pair.
 */
export const MODE_DOMAIN_WEIGHT_OVERRIDES: Readonly<
  Record<CoalitionStrategicMode, Partial<Record<DomainKey, number>>>
> = {
  // Pre-product / unclear positioning — push tech to dormant; lift marketing.
  discovery: {
    tech_infrastructure: COALITION_DOMAIN_WEIGHT_DORMANT,
    automation_processes: COALITION_DOMAIN_WEIGHT_DORMANT,
    marketing_utp: Math.max(COALITION_DOMAIN_WEIGHT_SECONDARY, COALITION_DOMAIN_WEIGHT_DEFAULT),
  },
  // First repeatable acquisition push — lift marketing+ux; tech baseline only.
  launch: {
    marketing_utp: COALITION_DOMAIN_WEIGHT_PRIMARY,
    ux_conversion: COALITION_DOMAIN_WEIGHT_SECONDARY,
  },
  // Mature acquisition + retention loops — broad lift, tech and automation rise.
  growth: {
    automation_processes: COALITION_DOMAIN_WEIGHT_SECONDARY,
    tech_infrastructure: Math.max(COALITION_DOMAIN_WEIGHT_DEFAULT, 1.2),
  },
  // Founder/expert lever — marketing primary regardless of constraint pair.
  authority: {
    marketing_utp: COALITION_DOMAIN_WEIGHT_PRIMARY,
  },
  // Competitive pressure / risk-of-loss — security+tech baseline must be high.
  defense: {
    security_compliance: COALITION_DOMAIN_WEIGHT_SECONDARY,
    tech_infrastructure: Math.max(COALITION_DOMAIN_WEIGHT_DEFAULT, 1.2),
  },
};

/**
 * Compute domain weights for the snapshot.
 * Rule: start every domain at default; apply constraint primary/secondary,
 * then overlay mode overrides (they win when in conflict).
 *
 * Used by Context Director when drafting the snapshot, and reused by the
 * orchestrator to validate a snapshot edited by a consultant.
 */
export function computeCoalitionDomainWeights(
  constraint: CoalitionDominantConstraint,
  mode: CoalitionStrategicMode,
): Record<DomainKey, number> {
  const weights: Record<DomainKey, number> = Object.fromEntries(
    DOMAIN_KEYS.map((d) => [d, COALITION_DOMAIN_WEIGHT_DEFAULT]),
  ) as Record<DomainKey, number>;

  weights[CONSTRAINT_PRIMARY_DOMAIN[constraint]] = COALITION_DOMAIN_WEIGHT_PRIMARY;
  weights[CONSTRAINT_SECONDARY_DOMAIN[constraint]] = Math.max(
    weights[CONSTRAINT_SECONDARY_DOMAIN[constraint]],
    COALITION_DOMAIN_WEIGHT_SECONDARY,
  );

  const overrides = MODE_DOMAIN_WEIGHT_OVERRIDES[mode] ?? {};
  for (const [domain, override] of Object.entries(overrides) as Array<[DomainKey, number]>) {
    // Mode overrides win — but never silently downgrade the constraint primary.
    if (domain === CONSTRAINT_PRIMARY_DOMAIN[constraint] && override < weights[domain]) continue;
    weights[domain] = override;
  }

  return weights;
}

// ----------------------------------------------------------------------------
// Tool names (canonical, used by prompt-loader and Anthropic tool definitions)
// ----------------------------------------------------------------------------

export const COALITION_TOOL_NAMES = {
  contextDirector: 'submit_client_situation',
  hypothesis: 'submit_domain_hypothesis',
  alignment: 'submit_domain_alignment',
  conflictResolver: 'submit_conflict_resolution',
} as const;

// ----------------------------------------------------------------------------
// Prompt-loader integration sets
// ----------------------------------------------------------------------------

/** Coalition prompts that should receive `_append-collaboration-protocol.md`. */
export const COALITION_PROMPT_NAMES = [
  'context-director',
  'cross-domain-conflict-resolver',
  ...DOMAIN_KEYS.map((d) => `${d}-hypothesis`),
  ...DOMAIN_KEYS.map((d) => `${d}-alignment`),
] as const;

/** Coalition prompts that additionally receive `_append-pipeline-trust-boundary.md`. */
export const COALITION_PIPELINE_TRUST_BOUNDARY_PROMPT_NAMES = [
  'context-director',
  'cross-domain-conflict-resolver',
] as const;

/** Coalition prompts that additionally receive `_append-non-domain-security-core.md`. */
export const COALITION_NON_DOMAIN_SECURITY_PROMPT_NAMES = [
  'context-director',
  'cross-domain-conflict-resolver',
] as const;
