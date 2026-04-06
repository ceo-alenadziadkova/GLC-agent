/**
 * Build API-shaped FreeSnapshotPreview from persisted audit state (portal mirror of /snapshot results).
 */

import type {
  AuditState,
  AuditIssue,
  FreeSnapshotPreview,
  QuickWin,
  Recommendation,
  SnapshotScanCoverageApi,
  SnapshotSiteProfile,
} from '../data/auditTypes';

function asIssueArray(raw: unknown): AuditIssue[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is AuditIssue => x != null && typeof x === 'object' && typeof (x as AuditIssue).title === 'string');
}

function asQuickWinArray(raw: unknown): QuickWin[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is QuickWin => x != null && typeof x === 'object' && typeof (x as QuickWin).title === 'string');
}

function asRecommendationArray(raw: unknown): NonNullable<FreeSnapshotPreview['program_recommendations']> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Recommendation => x != null && typeof x === 'object' && typeof (x as Recommendation).title === 'string')
    .map(r => ({
      id: r.id,
      title: r.title,
      description: r.description ?? '',
      priority: r.priority ?? 'medium',
    }));
}

/** Match server `overallToLegacyScore` for portal preview when only 0–100 score exists. */
function overallToLegacyScore(overall: number): number {
  if (overall >= 81) return 5;
  if (overall >= 61) return 4;
  if (overall >= 41) return 3;
  if (overall >= 21) return 2;
  return 1;
}

function legacyUxLabel(score: number): string {
  if (score >= 4) return 'Good';
  if (score >= 3) return 'Moderate';
  if (score >= 2) return 'Needs Work';
  return 'Critical';
}

function asScanCoverage(raw: unknown): SnapshotScanCoverageApi | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const c = raw as Record<string, unknown>;
  const budget = typeof c.budget_ms === 'number' ? c.budget_ms : typeof c.budgetMs === 'number' ? c.budgetMs : undefined;
  if (budget === undefined || !Number.isFinite(budget)) return undefined;
  const elapsed = typeof c.elapsed_ms === 'number' ? c.elapsed_ms : typeof c.elapsedMs === 'number' ? c.elapsedMs : 0;
  const pagesFetched =
    typeof c.pages_fetched === 'number' ? c.pages_fetched : typeof c.pagesFetched === 'number' ? c.pagesFetched : 0;
  const maxPlanned =
    typeof c.max_pages_planned === 'number'
      ? c.max_pages_planned
      : typeof c.maxPagesPlanned === 'number'
        ? c.maxPagesPlanned
        : 0;
  const rawPages = Array.isArray(c.pages) ? c.pages : [];
  const pages = rawPages.map((entry: unknown): SnapshotScanCoverageApi['pages'][number] => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return { final_url: '', status: 0, role: 'other' };
    }
    const p = entry as Record<string, unknown>;
    const final_url =
      typeof p.final_url === 'string' ? p.final_url : typeof p.finalUrl === 'string' ? p.finalUrl : '';
    const status = typeof p.status === 'number' ? p.status : 0;
    const r = p.role;
    const role =
      r === 'home' ||
      r === 'contact' ||
      r === 'pricing' ||
      r === 'about' ||
      r === 'services' ||
      r === 'other'
        ? r
        : 'other';
    return { final_url, status, role };
  });
  const out: SnapshotScanCoverageApi = {
    budget_ms: budget,
    elapsed_ms: elapsed,
    pages_fetched: pagesFetched,
    max_pages_planned: maxPlanned,
    pages,
  };
  if (c.robots_home_disallowed === true || c.robotsHomeDisallowed === true) out.robots_home_disallowed = true;
  if (c.robots_txt_fetched === true || c.robotsTxtFetched === true) out.robots_txt_fetched = true;
  if (c.playwright_eligible === true || c.playwrightEligible === true) out.playwright_eligible = true;
  if (c.playwright_used === true || c.playwrightUsed === true) out.playwright_used = true;
  const hf = c.home_fetch_failure ?? c.homeFetchFailure;
  if (hf === 'network_or_timeout' || hf === 'http_error' || hf === 'non_html' || hf === 'empty_body') {
    out.home_fetch_failure = hf;
  }
  return out;
}

export function freeSnapshotPreviewFromAuditState(state: AuditState): FreeSnapshotPreview | null {
  if (state.meta.product_mode !== 'free_snapshot') return null;
  const ux = state.domains['ux_conversion'];
  const recon = state.recon;
  const raw = ux?.raw_data as Record<string, unknown> | undefined;
  const det = raw?.snapshot_deterministic as Record<string, unknown> | undefined;

  const status: FreeSnapshotPreview['status'] =
    state.meta.status === 'completed'
      ? 'completed'
      : state.meta.status === 'failed'
        ? 'failed'
        : 'running';

  const siteProfile = det?.site_profile as SnapshotSiteProfile | undefined;
  const hs = det?.homepage_snippet as { title?: unknown; description?: unknown } | undefined;
  const homeTitle = typeof hs?.title === 'string' ? hs.title.trim() : '';
  const homeDesc = typeof hs?.description === 'string' ? hs.description.trim() : '';
  const homepage_snippet =
    homeTitle || homeDesc ? { title: homeTitle || '', description: homeDesc || '' } : undefined;

  const scanBand = det?.scan_confidence_band;
  const scan_confidence_band =
    scanBand === 'high' || scanBand === 'medium' || scanBand === 'low' ? scanBand : undefined;

  const classificationBand = det?.classification_confidence_band;
  const classification_confidence_band =
    classificationBand === 'high' || classificationBand === 'medium' || classificationBand === 'low'
      ? classificationBand
      : siteProfile?.classificationConfidenceBand;

  const categoryRaw = det?.category_scores;
  let category_scores: FreeSnapshotPreview['category_scores'] | undefined;
  if (categoryRaw && typeof categoryRaw === 'object' && !Array.isArray(categoryRaw)) {
    const o = categoryRaw as Record<string, unknown>;
    const ux_clarity = typeof o.ux_clarity === 'number' ? o.ux_clarity : undefined;
    const conversion_readiness =
      typeof o.conversion_readiness === 'number' ? o.conversion_readiness : undefined;
    const ai_readiness = typeof o.ai_readiness === 'number' ? o.ai_readiness : undefined;
    const technical_basics = typeof o.technical_basics === 'number' ? o.technical_basics : undefined;
    if (
      ux_clarity != null &&
      conversion_readiness != null &&
      ai_readiness != null &&
      technical_basics != null
    ) {
      category_scores = {
        ux_clarity,
        conversion_readiness,
        ai_readiness,
        technical_basics,
      };
    }
  }

  const issuesRaw = ux?.issues;
  const issuesFromUx = asIssueArray(issuesRaw).map(i => ({
    id: i.id,
    severity: i.severity,
    title: i.title,
    description: i.description ?? '',
    impact: i.impact ?? '',
  }));

  const quickWinsRaw = ux?.quick_wins;
  const quick_winsFromUx = asQuickWinArray(quickWinsRaw).map(q => ({
    id: q.id,
    title: q.title,
    description: q.description ?? '',
    effort: q.effort ?? '',
    timeframe: q.timeframe ?? '',
  }));

  const programRecommendations = asRecommendationArray(ux?.recommendations).slice(0, 5);

  const overallFromDet = typeof det?.overall_score === 'number' ? det.overall_score : undefined;
  let uxScoreOut = typeof ux?.score === 'number' ? ux.score : null;
  let uxLabelOut = ux?.label ?? null;
  let uxSummaryOut = ux?.summary ?? null;
  if (uxScoreOut === null && overallFromDet !== undefined) {
    uxScoreOut = overallToLegacyScore(overallFromDet);
    uxLabelOut = uxLabelOut ?? legacyUxLabel(uxScoreOut);
    if (!uxSummaryOut?.trim() && typeof det?.scan_basis === 'string' && det.scan_basis.trim()) {
      const s = det.scan_basis;
      uxSummaryOut = `${s.slice(0, 280)}${s.length > 280 ? '…' : ''}`;
    }
  }

  const signals_found = Array.isArray(det?.signals_found)
    ? (det.signals_found as unknown[]).map(s => String(s).trim()).filter(Boolean)
    : undefined;

  const limitations = Array.isArray(det?.limitations)
    ? (det.limitations as unknown[]).map(s => String(s).trim()).filter(Boolean)
    : undefined;

  const aiRaw = det?.ai_visibility as { gaps?: unknown } | undefined;
  const gaps: NonNullable<FreeSnapshotPreview['ai_visibility']>['gaps'] = [];
  const gapIds = new Set(['robots_txt', 'sitemap_html', 'structured_data', 'discovery_files']);
  if (aiRaw && Array.isArray(aiRaw.gaps)) {
    for (const g of aiRaw.gaps) {
      if (typeof g === 'string' && gapIds.has(g)) {
        gaps.push(g as (typeof gaps)[number]);
      }
    }
  }

  const accessBlocked = det?.snapshot_access_blocked === true;
  const accessRobots = det?.snapshot_access_robots_blocked === true;

  return {
    audit_id: state.meta.id,
    snapshot_token: state.meta.snapshot_token ?? '',
    status,
    company_url: state.meta.company_url,
    company_name: recon?.company_name ?? state.meta.company_name ?? null,
    tech_stack: (recon?.tech_stack as Record<string, string[]>) ?? {},
    tech_stack_tentative: Array.isArray(det?.tech_stack_tentative)
      ? (det.tech_stack_tentative as FreeSnapshotPreview['tech_stack_tentative'])
      : undefined,
    ai_visibility: gaps.length > 0 ? { gaps } : undefined,
    location: recon?.location ?? null,
    ux_score: uxScoreOut,
    ux_label: uxLabelOut,
    ux_summary: uxSummaryOut,
    issues: issuesFromUx,
    quick_wins: quick_winsFromUx,
    ...(programRecommendations.length > 0 ? { program_recommendations: programRecommendations } : {}),
    overall_score: overallFromDet,
    category_scores,
    scan_basis: typeof det?.scan_basis === 'string' ? det.scan_basis : undefined,
    signals_found: signals_found && signals_found.length > 0 ? signals_found : undefined,
    scan_confidence_band,
    site_profile: siteProfile,
    classification_confidence_band,
    scan_coverage: asScanCoverage(det?.scan_coverage),
    audit_rules_version: typeof det?.audit_rules_version === 'number' ? det.audit_rules_version : undefined,
    scan_basis_code:
      typeof det?.scan_basis_code === 'string'
        ? (det.scan_basis_code as FreeSnapshotPreview['scan_basis_code'])
        : undefined,
    cache_hit: det?.cache_hit === true,
    scanned_at: typeof det?.scanned_at === 'string' ? det.scanned_at : undefined,
    limitations: limitations && limitations.length > 0 ? limitations : undefined,
    homepage_snippet,
    competitor_mini: det?.competitor_mini as FreeSnapshotPreview['competitor_mini'] | undefined,
    ...(accessBlocked
      ? { snapshot_access_blocked: true, snapshot_access_robots_blocked: accessRobots }
      : {}),
  };
}
