import type { AuditIssue, QuickWin } from './entities-domain.js';

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
