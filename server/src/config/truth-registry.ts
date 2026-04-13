/**
 * TRUTH REGISTRY v1 — Source Priority & Phase Profiles
 *
 * Defines the canonical source priority order for fact resolution
 * and per-domain phase profiles used by FactChecker (Phase 2+).
 *
 * Version history:
 *   v1.0  — Phase 2: priority-based sources + 6 domain phase profiles
 *   v1.5  — Phase 3: profile confidence weights added (see phase-confidence-weights.ts)
 *   v2.1  — Sprint 1: external_api/document_feed source tiers (pre-declared, Phase 7+);
 *            auto_remediation_scope field on PhaseProfile (Phase 9 consumer)
 */

import type { DomainKey } from '../types/audit.js';

// ─── Source Types (match control-object.ts TruthSource) ───────────────────────

export type TruthSourceId =
  | 'internal_metrics'  // priority 1
  | 'user_brief'        // priority 2
  | 'external_search'   // priority 3
  | 'external_api'      // priority 4 — Phase 7+, pre-declared (ADR-MULTIMODAL-TRUTH.md)
  | 'document_feed';    // priority 5 — Phase 7+, pre-declared

export interface TruthSourceDef {
  id: TruthSourceId;
  /** Lower number = higher priority. Conflict resolution picks lowest priority number. */
  priority: number;
  description: string;
}

// ─── Truth Registry ────────────────────────────────────────────────────────────

export const TRUTH_REGISTRY = {
  sources: [
    {
      id: 'internal_metrics' as TruthSourceId,
      priority: 1,
      description: 'Collected product data: metrics, crawl results, analytics, logs',
    },
    {
      id: 'user_brief' as TruthSourceId,
      priority: 2,
      description: 'Client-provided BRIEF: stated goals, constraints, team info, context',
    },
    {
      id: 'external_api' as TruthSourceId,
      priority: 3,
      description: 'Authoritative structured external APIs (Phase 7+ connectors)',
    },
    {
      id: 'external_search' as TruthSourceId,
      priority: 4,
      description: 'Public data: search results, industry reports, benchmarks',
    },
    {
      id: 'document_feed' as TruthSourceId,
      priority: 5,
      description: 'Client-uploaded documents and ingested feeds (Phase 7+)',
    },
  ] as TruthSourceDef[],

  /**
   * When multiple sources provide conflicting values for the same fact,
   * the source with the lowest priority number wins.
   * 'priority_based' is the only strategy implemented in v1.
   */
  conflict_resolution: 'priority_based' as const,
} as const;

// ─── Phase Profile Shape ───────────────────────────────────────────────────────

export type AssumptionRisk = 'low' | 'medium' | 'high';

export interface PhaseProfile {
  phase_id: DomainKey;
  /**
   * Claim types that require elevated scrutiny in this domain.
   * If a claim matches one of these types it is classified as high-risk FACT
   * and any gap in truth_source elevates assumption risk.
   */
  high_risk_fact_types: string[];
  /**
   * Which truth sources are considered authoritative for this domain.
   * Claims not backed by any of these are marked UNVERIFIED.
   */
  authoritative_sources: TruthSourceId[];
  /**
   * Free-form error subtypes raised by FactChecker for this domain.
   * These feed into errors.structural / errors.data_gaps in CONTROL_OBJECT.
   */
  error_types: string[];
  /**
   * Default assumption risk for inferences specific to this domain.
   * High-risk domains (security, infra) default to 'medium'; others 'low'.
   */
  default_assumption_risk: AssumptionRisk;
  /**
   * v2.1+: Controls Phase 9 auto-remediation scope for this domain.
   *   'tone_only'        — auto-remediate only absolute language / hype phrases.
   *                        Content-level corrections always route to human review.
   *   'tone_and_content' — allow content-level fixable corrections in addition to tone.
   *
   * 'tone_only' is mandatory for security_compliance to avoid liability from model-
   * rewritten compliance or legal assertions. See ADR-PHASE-PROFILES.md §3.
   */
  auto_remediation_scope: 'tone_only' | 'tone_and_content';
}

// ─── Phase Profiles — 6 Domains ───────────────────────────────────────────────

export const PHASE_PROFILES: Record<DomainKey, PhaseProfile> = {
  tech_infrastructure: {
    phase_id: 'tech_infrastructure',
    high_risk_fact_types: [
      'performance_claim',      // "loads in <2s", "handles 10k RPS"
      'architecture_statement', // "microservices architecture", "monolith"
      'sla_claim',              // "99.9% uptime", "zero downtime deploys"
      'capacity_claim',         // "scales to 1M users", "2 TB storage"
      'timeline_claim',         // "migration done in 2 weeks"
    ],
    authoritative_sources: ['internal_metrics', 'user_brief'],
    error_types: [
      'infra_unverified_capacity',
      'infra_unrealistic_timeline',
      'infra_undocumented_dependency',
      'infra_missing_monitoring_evidence',
    ],
    default_assumption_risk: 'medium',
    auto_remediation_scope: 'tone_and_content',
  },

  security_compliance: {
    phase_id: 'security_compliance',
    high_risk_fact_types: [
      'compliance_status',      // "GDPR compliant", "SOC2 certified"
      'security_guarantee',     // "data is encrypted at rest"
      'data_handling_claim',    // "we never store PII"
      'vulnerability_status',   // "no known vulnerabilities"
      'access_control_claim',   // "MFA enforced for all users"
    ],
    authoritative_sources: ['internal_metrics', 'user_brief'],
    error_types: [
      'security_overclaim',
      'compliance_unverified',
      'data_policy_mismatch',
      'access_control_gap',
      'missing_security_evidence',
      'security_https_redirect_gap',
      'security_cookie_flag_gap',
      'security_header_hygiene_gap',
      'security_baseline_header_gap',
    ],
    default_assumption_risk: 'high',
    // Security & Compliance: auto-remediation restricted to tone ONLY.
    // Content-level changes to compliance claims must be reviewed by a human.
    // See ADR-PHASE-PROFILES.md §3 and ADR-AUTO-REMEDIATION.md.
    auto_remediation_scope: 'tone_only',
  },

  seo_digital: {
    phase_id: 'seo_digital',
    high_risk_fact_types: [
      'keyword_demand_claim',   // "this keyword has 50k monthly searches"
      'ranking_claim',          // "ranking #3 for X"
      'traffic_claim',          // "100k organic visits/month"
      'backlink_claim',         // "500 high-DA backlinks"
      'core_web_vitals_claim',  // "LCP < 2.5s"
    ],
    authoritative_sources: ['internal_metrics', 'external_search'],
    error_types: [
      'seo_unverified_traffic_figure',
      'seo_keyword_demand_unsubstantiated',
      'seo_missing_crawl_evidence',
      'seo_competitor_claim_unverified',
    ],
    default_assumption_risk: 'medium',
    auto_remediation_scope: 'tone_and_content',
  },

  ux_conversion: {
    phase_id: 'ux_conversion',
    high_risk_fact_types: [
      'conversion_rate_claim',  // "CR is 3.2%"
      'session_metric_claim',   // "average session 4 min"
      'funnel_drop_claim',      // "60% drop at checkout"
      'ab_test_claim',          // "variant B increased signups 20%"
      'accessibility_claim',    // "WCAG AA compliant"
    ],
    authoritative_sources: ['internal_metrics', 'user_brief'],
    error_types: [
      'ux_conversion_figure_unverified',
      'ux_benchmark_unsubstantiated',
      'ux_a11y_claim_unchecked',
      'ux_missing_analytics_evidence',
    ],
    default_assumption_risk: 'low',
    auto_remediation_scope: 'tone_and_content',
  },

  marketing_utp: {
    phase_id: 'marketing_utp',
    high_risk_fact_types: [
      'market_size_claim',      // "TAM is $5B"
      'competitor_claim',       // "competitor X has 40% market share"
      'utp_effectiveness_claim',// "our UTP outperforms category average"
      'audience_claim',         // "primary audience is 25-34 urban professionals"
      'channel_roi_claim',      // "email gives 42x ROI"
    ],
    authoritative_sources: ['user_brief', 'external_search'],
    error_types: [
      'marketing_market_size_unverified',
      'marketing_competitor_claim_unsourced',
      'marketing_audience_assumption_unstated',
      'marketing_roi_figure_speculative',
    ],
    default_assumption_risk: 'medium',
    auto_remediation_scope: 'tone_and_content',
  },

  automation_processes: {
    phase_id: 'automation_processes',
    high_risk_fact_types: [
      'time_saving_claim',      // "saves 20h/week"
      'automation_coverage_claim', // "80% of manual work automated"
      'tool_capability_claim',  // "Zapier handles this workflow"
      'integration_claim',      // "syncs in real-time with Salesforce"
      'roi_claim',              // "ROI realised in 3 months"
    ],
    authoritative_sources: ['user_brief', 'internal_metrics'],
    error_types: [
      'automation_time_saving_speculative',
      'automation_tool_capability_unverified',
      'automation_integration_complexity_underestimated',
      'automation_roi_timeline_unrealistic',
    ],
    default_assumption_risk: 'medium',
    auto_remediation_scope: 'tone_and_content',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the profile for a given domain key, or undefined for recon/strategy. */
export function getPhaseProfile(domainKey: string): PhaseProfile | undefined {
  return PHASE_PROFILES[domainKey as DomainKey];
}

/**
 * Given a raw `data_source` string from AuditIssue, returns the canonical TruthSourceId.
 * Matches the mapping in FactChecker.buildControlObject().
 */
export function mapDataSourceToTruthSource(dataSource: string): TruthSourceId {
  switch (dataSource) {
    case 'auto_detected':
    case 'collected':
      return 'internal_metrics';
    case 'from_brief':
    case 'user_provided':
      return 'user_brief';
    case 'external':
    case 'inferred':
    default:
      return 'external_search';
  }
}

/**
 * Returns the authoritative source with the highest priority (lowest priority number)
 * from the registry.
 */
export function getHighestPrioritySource(sources: TruthSourceId[]): TruthSourceId {
  const sorted = [...TRUTH_REGISTRY.sources]
    .filter(s => sources.includes(s.id))
    .sort((a, b) => a.priority - b.priority);
  return sorted[0]?.id ?? 'external_search';
}

/** Dedupe while preserving first-seen order, then sort by registry priority (1 = strongest). */
export function normalizeTruthSourcesList(sources: TruthSourceId[]): TruthSourceId[] {
  const seen = new Set<TruthSourceId>();
  const deduped: TruthSourceId[] = [];
  for (const id of sources) {
    if (!seen.has(id)) {
      seen.add(id);
      deduped.push(id);
    }
  }
  const priority = new Map(TRUTH_REGISTRY.sources.map(s => [s.id, s.priority] as const));
  return [...deduped].sort((a, b) => (priority.get(a) ?? 99) - (priority.get(b) ?? 99));
}
