import { PIPELINE_MAX_PHASE_INDEX } from '../config/pipeline-phases.js';

// ─── Product Modes ─────────────────────────────────────────
export type ProductMode = 'free_snapshot' | 'express' | 'full';
export type AuditCoveragePackage = 'starter' | 'pro' | 'complete';
export type AuditDepth = 'light' | 'standard' | 'deep';

export const PRODUCT_MODES: ProductMode[] = ['free_snapshot', 'express', 'full'];

/** Default `audits.product_mode` when absent in DB or API input (not to be confused with report `profile`). */
export const DEFAULT_AUDIT_PRODUCT_MODE: ProductMode = 'full';

// ─── Domain Keys ───────────────────────────────────────────
export const DOMAIN_KEYS = [
  'tech_infrastructure',
  'security_compliance',
  'seo_digital',
  'ux_conversion',
  'marketing_utp',
  'automation_processes',
] as const;

export type DomainKey = (typeof DOMAIN_KEYS)[number];

export interface AuditExecutionPlan {
  selected_domains: DomainKey[];
  depth: AuditDepth;
  source: 'user_selected' | 'system_default';
  recommended_domains?: DomainKey[];
  coverage_package?: AuditCoveragePackage;
  include_strategy?: boolean;
}

// ─── Phase Mapping ─────────────────────────────────────────
export const PHASE_DOMAIN_MAP: Record<number, DomainKey | 'recon' | 'strategy'> = {
  0: 'recon',
  1: 'tech_infrastructure',
  2: 'security_compliance',
  3: 'seo_digital',
  4: 'ux_conversion',
  5: 'marketing_utp',
  6: 'automation_processes',
  7: 'strategy',
};

export const REVIEW_AFTER_PHASES = [0, 4, 7] as const;

// ─── Express Mode constants ─────────────────────────────────
// Express runs Recon + Tech + Security + SEO + UX (phases 0-4).
// Marketing, Automation, and Strategy phases (5-7) are skipped.

export const EXPRESS_DOMAIN_KEYS = [
  'tech_infrastructure',
  'security_compliance',
  'seo_digital',
  'ux_conversion',
] as const satisfies readonly DomainKey[];

export const EXPRESS_MAX_PHASE = 4;
export const EXPRESS_REVIEW_AFTER_PHASES = [0, 4] as const;

/** Free snapshot runs recon + UX only (see PipelineOrchestrator.runFreeSnapshot). */
export const FREE_SNAPSHOT_MAX_PHASE = 4;

/** Returns the max phase number for a given product mode. */
export function maxPhaseForMode(mode: ProductMode): number {
  if (mode === 'free_snapshot') return FREE_SNAPSHOT_MAX_PHASE;
  if (mode === 'express') return EXPRESS_MAX_PHASE;
  return PIPELINE_MAX_PHASE_INDEX; // full
}

/** Returns which review gates apply for a given product mode. */
export function reviewPhasesForMode(mode: ProductMode): readonly number[] {
  if (mode === 'free_snapshot') return [];
  if (mode === 'express') return EXPRESS_REVIEW_AFTER_PHASES;
  return REVIEW_AFTER_PHASES;
}

export const DOMAIN_PHASES: Record<DomainKey, number> = {
  tech_infrastructure: 1,
  security_compliance: 2,
  seo_digital: 3,
  ux_conversion: 4,
  marketing_utp: 5,
  automation_processes: 6,
};

export function uniqueDomainKeys(input: readonly DomainKey[]): DomainKey[] {
  return DOMAIN_KEYS.filter((key) => input.includes(key));
}

export function executionPlanToPhases(plan: AuditExecutionPlan): number[] {
  const selected = uniqueDomainKeys(plan.selected_domains);
  const domainPhases = selected.map((d) => DOMAIN_PHASES[d]).sort((a, b) => a - b);
  const includeStrategy = plan.include_strategy === true;
  return [0, ...domainPhases, ...(includeStrategy ? [7] : [])];
}

export function reviewPhasesForExecutionPlan(plan: AuditExecutionPlan): number[] {
  const phases = executionPlanToPhases(plan);
  const reviews = new Set<number>();
  if (phases.includes(0)) reviews.add(0);
  if (phases.some((p) => p >= 1 && p <= 4)) reviews.add(4);
  if (phases.includes(7)) reviews.add(7);
  return Array.from(reviews).sort((a, b) => a - b);
}

export function maxPhaseForExecutionPlan(plan: AuditExecutionPlan): number {
  const phases = executionPlanToPhases(plan);
  return phases.length > 0 ? Math.max(...phases) : 0;
}

export type PhaseStatus = 'pending' | 'collecting' | 'analyzing' | 'completed' | 'failed';
export type AuditStatus =
  | 'created'
  | 'recon'
  | 'auto'
  | 'analytic'
  | 'review'
  | 'completed'
  | 'failed'
  | 'cancelled';

// ─── Score System (single source: @glc/intake-core) ─────────
export { SCORE_COLORS, SCORE_LABELS } from '@glc/intake-core';

// ─── Data Structures ───────────────────────────────────────
export interface AuditMeta {
  id: string;
  user_id: string | null;
  company_url: string;
  /** Persisted flag; legacy rows may be false while company_url is still a sentinel URL. */
  no_public_website?: boolean;
  company_name: string | null;
  industry: string | null;
  status: AuditStatus;
  current_phase: number;
  overall_score: number | null;
  token_budget: number;
  tokens_used: number;
  product_mode: ProductMode;
  execution_plan?: AuditExecutionPlan | null;
  snapshot_token: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Free Snapshot Result ──────────────────────────────────
/** Verifiable competitor line item for public free snapshot only. */
export interface SnapshotCompetitorComparison {
  metric: string;
  client_val: boolean | number;
  comp_val: boolean | number;
  winner: 'client' | 'competitor' | 'tie';
  label: string;
}

/** Advisory site understanding from deterministic snapshot (no LLM). */
export interface SnapshotSiteProfile {
  siteType: string;
  industry: string;
  conversionModel: string;
  primaryOffer: string;
  shortLabel: string;
  audienceGuess: 'b2b' | 'b2c' | 'b2b2c' | 'unknown';
  businessSignals: string[];
  classificationConfidence: number;
  classificationConfidenceBand: 'high' | 'medium' | 'low';
  companyNameGuess: string | null;
  locationGuess: string | null;
}

/** Public API shape for deterministic fetch coverage (snake_case JSON). */
export interface SnapshotScanCoverageApi {
  budget_ms: number;
  elapsed_ms: number;
  pages_fetched: number;
  max_pages_planned: number;
  pages: Array<{
    final_url: string;
    status: number;
    role: 'home' | 'contact' | 'pricing' | 'about' | 'services' | 'other';
  }>;
  /** Static HTML looked like a JS app shell (Playwright tier-3 may apply when enabled). */
  playwright_eligible?: boolean;
  /** Homepage was re-fetched with headless Chromium. */
  playwright_used?: boolean;
  /** robots.txt returned HTTP 200 and was parsed. */
  robots_txt_fetched?: boolean;
  /** robots.txt disallows `/` for the snapshot user-agent (no HTML fetched). */
  robots_home_disallowed?: boolean;
  /** When homepage is blocked: HEAD probe metadata (no response body). */
  robots_head_probe?: {
    status: number;
    content_type?: string;
    final_url?: string;
    x_robots_tag?: string;
    /** `glc_scanner` or `browser_compat` when env allows a second HEAD. */
    ua_used?: string;
  };
  /** Deterministic site bucket for copy when `robots_home_disallowed` (e.g. major platforms). */
  robots_fallback_site_class?: 'major_platform' | 'standard';
  /** Candidate extra URLs skipped due to Disallow rules. */
  robots_extras_skipped?: number;
  /** Time slept between fetches for Crawl-delay (ms). */
  crawl_delay_ms_applied?: number;
  /** Why the homepage fetch failed when robots allowed (machine-readable). */
  home_fetch_failure?: 'network_or_timeout' | 'http_error' | 'non_html' | 'empty_body';
  /** Heuristic: interstitial / WAF / bot challenge patterns in sampled HTML. */
  challenge_page_likely?: boolean;
  /** When set, coarse WAF / interstitial family (e.g. `cloudflare`, `datadome`, `generic_bot_interstitial`). */
  challenge_taxonomy?: string;
  /** Heuristic: parked or for-sale domain patterns. */
  parked_domain_likely?: boolean;
  parked_taxonomy?: string;
  /** Heuristic: sign-in gate or thin public shell. */
  login_wall_likely?: boolean;
  login_wall_taxonomy?: string;
}

export interface FreeSnapshotPreview {
  audit_id: string;
  snapshot_token: string;
  status: 'running' | 'completed' | 'failed';
  company_url: string;
  company_name: string | null;
  tech_stack: Record<string, string[]>;
  /** Possible technologies from weak signals only (quick scan); see `signal` per item. */
  tech_stack_tentative?: Array<{ name: string; category: string; signal: string }>;
  /** Surface gaps for AI/machine readability messaging (inferred from sampled HTML + robots fetch). */
  ai_visibility?: {
    gaps: Array<'robots_txt' | 'sitemap_html' | 'structured_data' | 'discovery_files'>;
  };
  location: string | null;
  ux_score: number | null;
  ux_label: string | null;
  ux_summary: string | null;
  issues: AuditIssue[];
  quick_wins: QuickWin[];
  /** 0–100 deterministic heuristic score (free snapshot rules engine). */
  overall_score?: number;
  category_scores?: {
    ux_clarity: number;
    conversion_readiness: number;
    ai_readiness: number;
    technical_basics: number;
  };
  scan_basis?: string;
  signals_found?: string[];
  scan_confidence_band?: 'high' | 'medium' | 'low';
  site_profile?: SnapshotSiteProfile;
  classification_confidence_band?: 'high' | 'medium' | 'low';
  scan_coverage?: SnapshotScanCoverageApi;
  /** YAML `version` in audit-rules.v1.yaml (deterministic catalog). */
  audit_rules_version?: number;
  /** ADR-normalized scan basis code. */
  scan_basis_code?:
    | 'homepage_only'
    | 'homepage_plus_core_pages'
    | 'homepage_rendered_fallback'
    | 'degraded'
    | 'cache_hit';
  /** True when this result was loaded from `snapshot_domain_cache` (fresh fetch skipped). */
  cache_hit?: boolean;
  /** When the snapshot payload was produced (ISO 8601). */
  scanned_at?: string;
  /** Human-readable constraints (e.g. robots block, timeout). */
  limitations?: string[];
  /** classification-rules YAML `version`. */
  classification_version?: number;
  /** Fired YAML signals and runner-up site type (explains `site_profile.siteType` for support / UI). */
  classification_transparency?: {
    matched_signals: string[];
    runner_up_site_type: string | null;
    runner_up_match_count: number | null;
    tie_ambiguous: boolean;
    score_top_two: [string, number][];
  };
  /** Tiered fetch + robots policy revision label. */
  fetch_strategy_version?: string;
  /** Snapshot engine release line. */
  snapshot_engine_version?: string;
  competitor_mini?: {
    competitor_name: string;
    competitor_url: string;
    comparisons: SnapshotCompetitorComparison[];
    data_source: 'auto_detected';
    confidence: 'high';
  };
  /** Title + description read from the fetched homepage (meta / Open Graph / first paragraph). */
  homepage_snippet?: { title: string; description: string };
  /** Server-set: snapshot could not usefully read public HTML (robots, fetch failure, etc.). */
  snapshot_access_blocked?: boolean;
  /** When blocked: true if robots.txt / policy prevented homepage fetch. */
  snapshot_access_robots_blocked?: boolean;
}

export interface ReconData {
  id: string;
  audit_id: string;
  status: PhaseStatus;
  company_name: string | null;
  industry: string | null;
  location: string | null;
  languages: string[];
  tech_stack: TechStack;
  social_profiles: Record<string, string>;
  contact_info: ContactInfo;
  pages_crawled: CrawledPage[];
  brief: string | null;
  interview_answers: string | null;
}

export interface TechStack {
  cms: string[];
  analytics: string[];
  hosting_cdn: string[];
  frameworks: string[];
  chat_support: string[];
  ecommerce: string[];
  email_marketing: string[];
  booking: string[];
}

export interface ContactInfo {
  emails: string[];
  phones: string[];
  addresses: string[];
}

export interface CrawledPage {
  url: string;
  title: string;
  status: number;
  meta_description: string | null;
  h1: string[];
  h2: string[];
  structured_data: string[];
  /** Field names match crawler.ts output exactly: total / with_alt / missing_alt / lazy_loaded */
  images: {
    total: number;
    with_alt: number;
    missing_alt: number;
    lazy_loaded: number;
  };
  links: { internal: string[]; external: string[] };
  content_length?: number;
  load_time_ms?: number;
}

// ─── Finding Provenance (Sprint 14) ───────────────────────
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type DataSource = 'auto_detected' | 'from_brief' | 'inferred';

/**
 * A raw data point that backs a finding.
 * type: short key describing the check ('http_header_scan', 'page_crawl', 'html_meta_tag', etc.)
 * url:  the page URL where the evidence was observed (optional for site-wide checks)
 * finding: the raw value / observation (e.g. header name, tag content, metric value)
 */
export interface EvidenceRef {
  type: string;
  url?: string;
  finding: string;
}

/**
 * Optional cross-phase premise link (Phase 8 causal DAG).
 * `phase_id` must be a known pipeline phase; `claim_id` is 1-based within that phase's CONTROL_OBJECT issues.
 */
export interface AuditIssuePremiseRef {
  phase_id: string;
  claim_id: number;
}

export interface AuditIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  /** How confident the agent is that this finding is accurate. */
  confidence: ConfidenceLevel;
  /** Raw data points that back this finding. At least one ref required. */
  evidence_refs: EvidenceRef[];
  /** Where the finding data came from. */
  data_source: DataSource;
  /**
   * When FEATURE_CAUSAL_DAG is enabled, links this finding to prior-phase claims it builds on.
   * Omitted in most runs until prompts teach the model to populate it.
   */
  premise_refs?: AuditIssuePremiseRef[];
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimated_cost: string;
  estimated_time: string;
  impact: string;
}

export interface QuickWin {
  id: string;
  title: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  timeframe: string;
}

export interface ConfidenceDistribution {
  high: number;
  medium: number;
  low: number;
}

export interface DomainResult {
  score: number;
  label: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  issues: AuditIssue[];
  quick_wins: QuickWin[];
  recommendations: Recommendation[];
  /**
   * Areas the agent could not evaluate due to missing/unavailable data.
   * E.g. ["Page speed data unavailable — server-side crawl only", "No pricing page found"]
   */
  unknown_items: string[];
  /** Computed by BaseAgent after fact-check — not provided by Claude directly. */
  confidence_distribution?: ConfidenceDistribution;
}

export interface DomainData extends DomainResult {
  id: string;
  audit_id: string;
  domain_key: DomainKey;
  phase_number: number;
  status: PhaseStatus;
  version: number;
  raw_data: Record<string, unknown>;
}

export interface StrategyInitiative {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  dependencies?: string[];
}

export interface StrategyRoadmap {
  id: string;
  audit_id: string;
  status: PhaseStatus;
  executive_summary: string | null;
  overall_score: number | null;
  quick_wins: StrategyInitiative[];
  medium_term: StrategyInitiative[];
  strategic: StrategyInitiative[];
  scorecard: ScorecardEntry[];
}

export interface ScorecardEntry {
  domain_key: DomainKey;
  label: string;
  score: number;
  weight: number;
  weighted_score: number;
}

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

// ─── Quality Gate (Sprint 16) ──────────────────────────────

/**
 * A single finding raised by the consistency checker.
 * Stored in pipeline_events (event_type: 'quality_gate') as part of QualityGateReport.
 */
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

// ─── Intake Brief ──────────────────────────────────────────

export type BriefPriority = 'required' | 'recommended' | 'optional';
export type BriefResponseSource = 'client' | 'consultant' | 'recon_confirmed' | 'unknown';
export type IntakeReadinessBadge = 'low' | 'medium' | 'high';
export type IntakeNextBestAction = 'complete_required' | 'add_recommended' | 'confirm_prefill' | 'none';

export type BriefRevenueSignal = 'high' | 'medium' | 'low';

export interface BriefQuestion {
  id: string;
  priority: BriefPriority;
  importance?: 'red' | 'yellow' | 'green';
  intake_layer?: 0 | 1 | 2 | 3 | 'pre_brief';
  weight?: number;
  ux_group?: 'basics' | 'business' | 'tech' | 'audience' | 'goals';
  /**
   * UI section heading (wizard / public intake). Kept in sync with frontend `briefQuestions.ts`.
   */
  section?: string;
  /** Which agents this question feeds context to */
  domains: Array<DomainKey | 'all'>;
  question: string;
  hint?: string;
  /** Interview probe: what to listen for / clarify live with the client. */
  consultant_hint?: string;
  /** Weight for revenue / impact prioritisation in analytics (high = sparse). */
  revenue_signal?: BriefRevenueSignal;
  /** Question IDs unlocked in Layer 3 when this answer satisfies follow-up rules (product extension). */
  triggers_followup?: string[];
  /** free_text | single_choice | multi_choice | number | rating | confirm */
  type: 'free_text' | 'single_choice' | 'multi_choice' | 'number' | 'rating' | 'confirm';
  options?: string[];
}

export type BriefResponseValue = string | string[] | number | boolean | null;
export interface BriefResponseEntry {
  value: BriefResponseValue;
  source: BriefResponseSource;
}

/** Crawler vs client disagreement on recon-suggested fields (e.g. c1 stack confirm). */
export interface ReconConflict {
  questionId: string;
  detectedValue: string;
  clientValue: string;
  status: 'open' | 'resolved';
  resolvedAt?: string;
  notes?: string;
}

export type IntakeBriefCollectionMode = 'self_serve' | 'interview' | 'pre_brief' | 'discovery';

/** Semver / bundle ids for intake artifacts (ADR unified question bank). */
export interface IntakeVersionTuple {
  questionBankVersion: string;
  policyVersion: string;
  layoutVersion: string;
  resolverVersion: string;
}

/** Logged when a brief row is moved between supported artifact tuples (e.g. client upgrade). */
export interface IntakeVersionMigration {
  from: IntakeVersionTuple;
  to: IntakeVersionTuple;
  at: string;
  reason: 'client_upgrade' | 'unsupported_stored_repaired';
}

export interface IntakeBrief {
  id: string;
  audit_id: string;
  responses: Record<string, BriefResponseValue | BriefResponseEntry>;
  status: 'draft' | 'submitted';
  layer_completed: 0 | 1 | 2 | 3;
  collected_by: 'client' | 'consultant';
  collection_mode: IntakeBriefCollectionMode;
  data_quality_score: number;
  sla_met: boolean;
  answered_required: number;
  answered_recommended: number;
  answered_optional: number;
  total_required: number;
  total_recommended: number;
  total_optional: number;
  recon_prefills: Record<string, unknown>;
  recon_conflicts: ReconConflict[];
  post_audit_questions: Array<Record<string, unknown>>;
  progress_pct: number;
  readiness_badge: IntakeReadinessBadge;
  next_best_action: IntakeNextBestAction;
  responses_format: 2;
  /** Null if row predates migration 027; validation uses current engine. */
  intake_versions?: IntakeVersionTuple | null;
  /** Last intake_versions migration (upgrade or repair of unsupported stored tuple). */
  intake_version_migration?: IntakeVersionMigration | null;
  created_at: string;
  updated_at: string;
}

// ─── Full Audit State (for API responses) ──────────────────
export interface AuditState {
  meta: AuditMeta;
  recon: ReconData | null;
  domains: Record<DomainKey, DomainData | null>;
  strategy: StrategyRoadmap | null;
  reviews: ReviewPoint[];
  events: PipelineEvent[];
  brief: IntakeBrief | null;
}
