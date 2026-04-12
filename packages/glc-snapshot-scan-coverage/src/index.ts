/**
 * Normalize persisted `scan_coverage` JSON from `snapshot_deterministic` (snake_case or camelCase).
 * Shared by GET /api/snapshot and the portal preview builder — keep in sync when adding fields.
 */

export type SnapshotScanCoveragePageRole =
  | 'home'
  | 'contact'
  | 'pricing'
  | 'about'
  | 'services'
  | 'other';

/** Structural match for public API `scan_coverage`; avoid importing server-only types here. */
export type NormalizedSnapshotScanCoverage = {
  budget_ms: number;
  elapsed_ms: number;
  pages_fetched: number;
  max_pages_planned: number;
  pages: Array<{
    final_url: string;
    status: number;
    role: SnapshotScanCoveragePageRole;
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
};

export function normalizeScanCoverageFromStoredJson(stored: unknown): NormalizedSnapshotScanCoverage | null {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null;
  const c = stored as Record<string, unknown>;
  const budgetRaw = c.budget_ms ?? c.budgetMs;
  if (typeof budgetRaw !== 'number' || !Number.isFinite(budgetRaw)) return null;

  const elapsedRaw = c.elapsed_ms ?? c.elapsedMs;
  const elapsed_ms = typeof elapsedRaw === 'number' && Number.isFinite(elapsedRaw) ? elapsedRaw : 0;

  const pfRaw = c.pages_fetched ?? c.pagesFetched;
  const pages_fetched = typeof pfRaw === 'number' && Number.isFinite(pfRaw) ? pfRaw : 0;

  const maxRaw = c.max_pages_planned ?? c.maxPagesPlanned;
  const max_pages_planned = typeof maxRaw === 'number' && Number.isFinite(maxRaw) ? maxRaw : 0;

  const rawPages = Array.isArray(c.pages) ? c.pages : [];
  const pages: NormalizedSnapshotScanCoverage['pages'] = rawPages.map((entry: unknown) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return { final_url: '', status: 0, role: 'other' };
    }
    const p = entry as Record<string, unknown>;
    const final_url =
      typeof p.final_url === 'string' ? p.final_url : typeof p.finalUrl === 'string' ? p.finalUrl : '';
    const status = typeof p.status === 'number' ? p.status : 0;
    const roleRaw = p.role;
    const role: SnapshotScanCoveragePageRole =
      roleRaw === 'home' ||
      roleRaw === 'contact' ||
      roleRaw === 'pricing' ||
      roleRaw === 'about' ||
      roleRaw === 'services' ||
      roleRaw === 'other'
        ? roleRaw
        : 'other';
    return { final_url, status, role };
  });

  const out: NormalizedSnapshotScanCoverage = {
    budget_ms: budgetRaw,
    elapsed_ms,
    pages_fetched,
    max_pages_planned,
    pages,
  };

  if (c.playwright_eligible === true || c.playwrightEligible === true) out.playwright_eligible = true;
  if (c.playwright_used === true || c.playwrightUsed === true) out.playwright_used = true;
  if (c.robots_txt_fetched === true || c.robotsTxtFetched === true) out.robots_txt_fetched = true;
  if (c.robots_home_disallowed === true || c.robotsHomeDisallowed === true) out.robots_home_disallowed = true;

  const rhp = c.robots_head_probe ?? c.robotsHeadProbe;
  if (rhp && typeof rhp === 'object' && !Array.isArray(rhp)) {
    const hp = rhp as Record<string, unknown>;
    const st = hp.status;
    if (typeof st === 'number' && Number.isFinite(st)) {
      const probe: NonNullable<NormalizedSnapshotScanCoverage['robots_head_probe']> = { status: st };
      const ct = hp.content_type ?? hp.contentType;
      if (typeof ct === 'string' && ct.trim()) probe.content_type = ct;
      const fu = hp.final_url ?? hp.finalUrl;
      if (typeof fu === 'string' && fu.trim()) probe.final_url = fu;
      const xr = hp.x_robots_tag ?? hp.xRobotsTag;
      if (typeof xr === 'string' && xr.trim()) probe.x_robots_tag = xr;
      const ua = hp.ua_used ?? hp.uaUsed;
      if (typeof ua === 'string' && ua.trim()) probe.ua_used = ua;
      out.robots_head_probe = probe;
    }
  }

  const rfc = c.robots_fallback_site_class ?? c.robotsFallbackSiteClass;
  if (rfc === 'major_platform' || rfc === 'standard') out.robots_fallback_site_class = rfc;

  if (typeof c.robots_extras_skipped === 'number') out.robots_extras_skipped = c.robots_extras_skipped;
  if (typeof c.crawl_delay_ms_applied === 'number') out.crawl_delay_ms_applied = c.crawl_delay_ms_applied;

  const hf = c.home_fetch_failure ?? c.homeFetchFailure;
  if (hf === 'network_or_timeout' || hf === 'http_error' || hf === 'non_html' || hf === 'empty_body') {
    out.home_fetch_failure = hf;
  }
  if (c.challenge_page_likely === true || c.challengePageLikely === true) out.challenge_page_likely = true;
  const ct = c.challenge_taxonomy ?? c.challengeTaxonomy;
  if (typeof ct === 'string' && ct.trim()) out.challenge_taxonomy = ct;
  if (c.parked_domain_likely === true || c.parkedDomainLikely === true) out.parked_domain_likely = true;
  const pt = c.parked_taxonomy ?? c.parkedTaxonomy;
  if (typeof pt === 'string' && pt.trim()) out.parked_taxonomy = pt;
  if (c.login_wall_likely === true || c.loginWallLikely === true) out.login_wall_likely = true;
  const lt = c.login_wall_taxonomy ?? c.loginWallTaxonomy;
  if (typeof lt === 'string' && lt.trim()) out.login_wall_taxonomy = lt;

  return out;
}
