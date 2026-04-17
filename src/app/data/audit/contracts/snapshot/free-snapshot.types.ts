/** Verifiable competitor comparison line (free snapshot). */
export interface SnapshotCompetitorComparison {
  metric: string;
  client_val: boolean | number;
  comp_val: boolean | number;
  winner: 'client' | 'competitor' | 'tie';
  label: string;
}

/** Advisory classification from deterministic snapshot scan. */
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
  playwright_eligible?: boolean;
  playwright_used?: boolean;
  robots_txt_fetched?: boolean;
  robots_home_disallowed?: boolean;
  robots_head_probe?: {
    status: number;
    content_type?: string;
    final_url?: string;
    x_robots_tag?: string;
    ua_used?: string;
  };
  robots_fallback_site_class?: 'major_platform' | 'standard';
  robots_extras_skipped?: number;
  crawl_delay_ms_applied?: number;
  home_fetch_failure?: 'network_or_timeout' | 'http_error' | 'non_html' | 'empty_body';
  challenge_page_likely?: boolean;
  challenge_taxonomy?: string;
  parked_domain_likely?: boolean;
  parked_taxonomy?: string;
  login_wall_likely?: boolean;
  login_wall_taxonomy?: string;
}

// Free Snapshot result (public, no auth)
export interface FreeSnapshotPreview {
  audit_id: string;
  snapshot_token: string;
  status: 'running' | 'completed' | 'failed';
  company_url: string;
  company_name: string | null;
  tech_stack: Record<string, string[]>;
  tech_stack_tentative?: Array<{ name: string; category: string; signal: string }>;
  ai_visibility?: {
    gaps: Array<'robots_txt' | 'sitemap_html' | 'structured_data' | 'discovery_files'>;
  };
  location: string | null;
  ux_score: number | null;
  ux_label: string | null;
  ux_summary: string | null;
  issues: Array<{ id: string; severity: string; title: string; description: string; impact: string }>;
  quick_wins: Array<{ id: string; title: string; description: string; effort: string; timeframe: string }>;
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
  audit_rules_version?: number;
  scan_basis_code?:
    | 'homepage_only'
    | 'homepage_plus_core_pages'
    | 'homepage_rendered_fallback'
    | 'degraded'
    | 'cache_hit';
  cache_hit?: boolean;
  scanned_at?: string;
  limitations?: string[];
  classification_version?: number;
  classification_transparency?: {
    matched_signals: string[];
    runner_up_site_type: string | null;
    runner_up_match_count: number | null;
    tie_ambiguous: boolean;
    score_top_two: [string, number][];
  };
  fetch_strategy_version?: string;
  snapshot_engine_version?: string;
  competitor_mini?: {
    competitor_name: string;
    competitor_url: string;
    comparisons: SnapshotCompetitorComparison[];
    data_source: 'auto_detected';
    confidence: 'high';
  };
  homepage_snippet?: { title: string; description: string };
  /** Server-set: snapshot could not usefully read public HTML. */
  snapshot_access_blocked?: boolean;
  /** When blocked: true if robots.txt / policy prevented homepage fetch. */
  snapshot_access_robots_blocked?: boolean;
  /** Snapshot-domain recommendations (e.g. upgrade to full audit); optional, not shown on public token API trim. */
  program_recommendations?: Array<{
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}
