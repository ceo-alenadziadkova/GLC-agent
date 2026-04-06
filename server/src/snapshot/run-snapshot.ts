/**
 * Deterministic free snapshot: tiered fetch, facts, site profile, audit rules, persist recon + UX row.
 */
import { createHash } from 'node:crypto';
import * as cheerio from 'cheerio';
import { supabase } from '../services/supabase.js';
import { logger } from '../services/logger.js';
import type { CrawledPage, DomainResult, FreeSnapshotPreview } from '../types/audit.js';
import { fetchTieredPages } from './fetch-tiered.js';
import { extractFacts } from './extract-facts.js';
import { runSiteProfile, type SiteProfileDebug } from './classification/site-profile-runner.js';
import { runSnapshotAudit, overallToLegacyScore } from './audit/run-audit.js';
import {
  readSnapshotCache,
  writeSnapshotCache,
  normalizeSnapshotHost,
  redactSnapshotPayloadForDomainCache,
} from './cache.js';
import {
  acquireSnapshotFreshConcurrency,
  noteSnapshotFreshFetchCompleted,
  releaseSnapshotFreshConcurrency,
  SnapshotAtCapacityError,
} from './abuse-guards.js';
import type { SnapshotAuditResult, SnapshotCachePayload, SiteProfile, SnapshotScanCoverage } from './types.js';
import { SnapshotFactsSchema } from './types.js';
import { extractJsonLdTypes, detectTechStackRecord } from '../lib/site-html-signals.js';
import { ISSUE_MESSAGES, QUICK_WIN_MESSAGES } from './messages.js';
import { getAuditRules, getAuditRulesCatalogVersion } from './audit/parse-audit-rules.js';
import { getClassificationRulesVersion } from './classification/parse-rules.js';
import {
  SNAPSHOT_ENGINE_VERSION,
  SNAPSHOT_FETCH_STRATEGY_VERSION,
} from './snapshot-versions.js';
import type { SnapshotScanCoverageApi, SnapshotSiteProfile } from '../types/audit.js';
import { anomalyLimitationMessages } from './page-anomaly.js';
import { recordSnapshotRunMetrics } from './snapshot-metrics.js';

function buildCrawledPages(
  urls: string[],
  htmlByUrl: Map<string, string>,
  baseUrl: string,
): CrawledPage[] {
  const out: CrawledPage[] = [];
  for (const url of urls) {
    const html = htmlByUrl.get(url);
    if (!html) continue;
    const $ = cheerio.load(html);
    const internal: string[] = [];
    const external: string[] = [];
    const base = new URL(url);
    $('a[href]').each((_, a) => {
      const href = $(a).attr('href');
      if (!href || href.startsWith('#')) return;
      try {
        const linkUrl = new URL(href, url);
        if (linkUrl.hostname === base.hostname) internal.push(linkUrl.href);
        else external.push(linkUrl.href);
      } catch {
        /* skip */
      }
    });
    const structured_data = extractJsonLdTypes(html);
    const images = $('img');
    let withAlt = 0;
    let missingAlt = 0;
    images.each((_, img) => {
      if ($(img).attr('alt')?.trim()) withAlt++;
      else missingAlt++;
    });
    out.push({
      url,
      title: $('title').text().trim() || '',
      status: 200,
      meta_description: $('meta[name="description"]').attr('content')?.trim() || null,
      h1: $('h1').map((_, el) => $(el).text().trim()).get(),
      h2: $('h2').map((_, el) => $(el).text().trim()).get(),
      structured_data: [...new Set(structured_data)],
      images: { total: images.length, with_alt: withAlt, missing_alt: missingAlt, lazy_loaded: 0 },
      links: { internal: [...new Set(internal)], external: [...new Set(external)].slice(0, 40) },
      content_length: html.length,
      load_time_ms: 0,
    });
  }
  return out.length > 0 ? out : buildMinimalPage(baseUrl);
}

function buildDegradedLimitations(coverage: SnapshotScanCoverage): string[] {
  if (coverage.robotsHomeDisallowed) {
    return [
      'robots.txt disallows automated access to the homepage for our snapshot crawler (User-agent * / GLC-SnapshotScanner).',
    ];
  }
  switch (coverage.homeFetchFailure) {
    case 'non_html':
      return [
        'The homepage returned a non-HTML response (for example JSON, PDF, or API output), so the snapshot parser cannot run.',
      ];
    case 'http_error':
      return ['The homepage returned an HTTP error instead of a successful HTML page.'];
    case 'empty_body':
      return ['The homepage response had an empty body.'];
    case 'network_or_timeout':
      return [
        'The homepage could not be retrieved in time (network error, timeout, TLS failure, or blocking).',
      ];
    default:
      return [
        'The homepage could not be retrieved within the time budget (timeout, blocking, TLS, or network error).',
      ];
  }
}

function buildUnknownSiteProfile(): SiteProfile {
  return {
    siteType: 'unknown',
    industry: 'unknown',
    conversionModel: 'unknown',
    primaryOffer: '',
    shortLabel: '',
    audienceGuess: 'unknown',
    businessSignals: [],
    classificationConfidence: 0,
    classificationConfidenceBand: 'low',
    companyNameGuess: null,
    locationGuess: null,
  };
}

function snapshotDomainFingerprint(host: string | null): string | null {
  if (!host) return null;
  return createHash('sha256').update(host.toLowerCase()).digest('hex').slice(0, 16);
}

/** Structured line for metrics / dashboards (ADR observability). No raw URL — only registrable-host fingerprint. */
function logSnapshotRunComplete(args: {
  auditId: string;
  host: string | null;
  startedAt: number;
  outcome: 'cache_hit' | 'fresh_completed' | 'degraded';
  payload: SnapshotCachePayload;
}): void {
  const durationMs = Date.now() - args.startedAt;
  const { audit, site_profile: siteProfile, scan_coverage: scanCoverage, degraded } = args.payload;
  logger.info('snapshot.run_complete', {
    component: 'snapshot',
    audit_id: args.auditId,
    domain_fp: snapshotDomainFingerprint(args.host),
    duration_ms: durationMs,
    outcome: args.outcome,
    cache_hit: args.outcome === 'cache_hit',
    degraded: degraded === true,
    scan_basis_code: audit.scanBasisCode ?? null,
    overall_score: audit.overallScore,
    pages_fetched: scanCoverage?.pagesFetched ?? null,
    playwright_used: scanCoverage?.playwrightUsed ?? null,
    home_fetch_failure: scanCoverage?.homeFetchFailure ?? null,
    site_type: siteProfile.siteType,
    classification_band: siteProfile.classificationConfidenceBand,
    scan_confidence_band: audit.scanConfidenceBand,
    audit_rules_version: audit.rulesCatalogVersion ?? null,
  });
  recordSnapshotRunMetrics({
    outcome: args.outcome,
    duration_ms: durationMs,
    cache_hit: args.outcome === 'cache_hit',
    playwright_used: scanCoverage?.playwrightUsed === true,
    home_fetch_failure: scanCoverage?.homeFetchFailure ?? null,
    rule_results: audit.ruleResults,
  });
}

function buildMinimalPage(url: string): CrawledPage[] {
  return [
    {
      url,
      title: '',
      status: 0,
      meta_description: null,
      h1: [],
      h2: [],
      structured_data: [],
      images: { total: 0, with_alt: 0, missing_alt: 0, lazy_loaded: 0 },
      links: { internal: [], external: [] },
      content_length: 0,
      load_time_ms: 0,
    },
  ];
}

function syntheticDomainResult(
  legacyScore: number,
  summary: string,
  issues: DomainResult['issues'],
  quickWins: DomainResult['quick_wins'],
): DomainResult {
  const label =
    legacyScore >= 4 ? 'Good' : legacyScore >= 3 ? 'Moderate' : legacyScore >= 2 ? 'Needs Work' : 'Critical';
  return {
    score: legacyScore,
    label,
    summary: summary.length >= 50 ? summary : `${summary} Free snapshot is based on quick heuristics only.`,
    strengths: [
      'Deterministic scan completed without LLM cost.',
      'Findings tie to observable homepage signals.',
    ],
    weaknesses: [
      'Only a few pages were sampled; deep crawl and expert review are not included.',
    ],
    issues: issues.length > 0 ? issues : [
      {
        id: 'snapshot-placeholder-issue',
        severity: 'low',
        title: 'No major snapshot flags on the sampled pages.',
        description: 'Heuristic checks did not surface top issues; a full audit may still find improvements.',
        impact: 'Informational',
        confidence: 'low',
        evidence_refs: [{ type: 'snapshot_rule', finding: 'all MVP rules passed or partial' }],
        data_source: 'auto_detected',
      },
    ],
    quick_wins: quickWins.length > 0
      ? quickWins
      : [
          {
            id: 'snapshot-placeholder-qw',
            title: 'Run a full audit for deeper UX, SEO, and tech review.',
            description: 'The free snapshot uses a small rule set on limited pages.',
            effort: 'low',
            timeframe: 'When you are ready to prioritise roadmap work',
          },
        ],
    recommendations: [
      {
        id: 'snapshot-rec-1',
        title: 'Upgrade to a full GLC audit',
        description: 'Covers all domains, more pages, and expert-quality synthesis.',
        priority: 'high' as const,
        estimated_cost: 'See pricing',
        estimated_time: 'Varies',
        impact: 'High',
      },
    ],
    unknown_items: ['Full funnel, performance lab data, and security depth are out of scope for free snapshot.'],
    confidence_distribution: { high: 0, medium: 1, low: 1 },
  };
}

export interface DeterministicSnapshotResult {
  preview: FreeSnapshotPreview;
  profileDebug?: SiteProfileDebug;
}

export async function runDeterministicSnapshot(auditId: string): Promise<DeterministicSnapshotResult> {
  const startedAt = Date.now();
  const { data: audit, error: aErr } = await supabase
    .from('audits')
    .select('company_url, snapshot_token, company_name')
    .eq('id', auditId)
    .single();

  if (aErr || !audit?.company_url) {
    throw new Error('Audit not found or missing company_url');
  }

  const companyUrl = audit.company_url as string;
  const token = (audit.snapshot_token as string) ?? '';
  const host = normalizeSnapshotHost(companyUrl);

  const cached = await readSnapshotCache(host);
  if (cached) {
    await persistFromCache(auditId, companyUrl, cached, {
      persistedFromDomainCache: true,
      redactContactInRecon: true,
    });
    const preview = buildPreviewFromPayload(auditId, token, companyUrl, cached, {
      fromDomainCache: true,
    });
    logSnapshotRunComplete({
      auditId,
      host,
      startedAt,
      outcome: 'cache_hit',
      payload: cached,
    });
    return { preview };
  }

  const { acquired, leaseId } = await acquireSnapshotFreshConcurrency();
  if (!acquired) {
    throw new SnapshotAtCapacityError();
  }

  let released = false;
  const releaseOnce = async () => {
    if (!released) {
      released = true;
      await releaseSnapshotFreshConcurrency(leaseId);
    }
  };

  try {
    const { pages, baseHref, coverage } = await fetchTieredPages(companyUrl);
    if (pages.length === 0) {
      const limitations = buildDegradedLimitations(coverage);
      const scannedAt = new Date().toISOString();
      const unknownProfile = buildUnknownSiteProfile();
      const audit: SnapshotAuditResult = {
        overallScore: 0,
        categoryScores: {
          ux_clarity: 0,
          conversion_readiness: 0,
          ai_readiness: 0,
          technical_basics: 0,
        },
        ruleResults: [],
        scanBasis: 'No HTML pages were sampled; heuristic scoring was not applied.',
        scanBasisCode: 'degraded',
        signalsFound: [],
        scanConfidenceBand: 'low',
        rulesCatalogVersion: getAuditRulesCatalogVersion(),
      };
      const degradedPayload: SnapshotCachePayload = {
        version: 1,
        site_profile: unknownProfile,
        audit,
        tech_stack: {},
        pages_crawled: buildMinimalPage(companyUrl),
        scan_coverage: coverage,
        company_name: null,
        location: null,
        languages: [],
        contact_info: { emails: [], phones: [], addresses: [] },
        scanned_at: scannedAt,
        limitations,
        degraded: true,
        classification_version: getClassificationRulesVersion(),
        fetch_strategy_version: SNAPSHOT_FETCH_STRATEGY_VERSION,
        snapshot_engine_version: SNAPSHOT_ENGINE_VERSION,
      };
      await persistFromCache(auditId, companyUrl, degradedPayload, {
        persistedFromDomainCache: false,
        redactContactInRecon: true,
      });
      const preview = buildPreviewFromPayload(auditId, token, companyUrl, degradedPayload, {
        fromDomainCache: false,
      });
      logSnapshotRunComplete({
        auditId,
        host,
        startedAt,
        outcome: 'degraded',
        payload: degradedPayload,
      });
      return { preview };
    }

    const rawFacts = extractFacts(pages, baseHref);
    if (coverage.challengeLikely || coverage.parkedLikely || coverage.loginWallLikely) {
      rawFacts.contentQuality = 'low';
      if (coverage.challengeLikely === true || coverage.loginWallLikely === true) {
        rawFacts.appShellLikely = true;
      }
    }
    const facts = SnapshotFactsSchema.parse(rawFacts);

    const anomalyNotes = anomalyLimitationMessages({
      challengeLikely: coverage.challengeLikely === true,
      parkedLikely: coverage.parkedLikely === true,
      loginWallLikely: coverage.loginWallLikely === true,
    });

    const { profile, debug } = runSiteProfile(facts);
    logger.info('snapshot.site_profile', {
      audit_id: auditId,
      siteType: profile.siteType,
      industry: profile.industry,
      band: profile.classificationConfidenceBand,
      matched: debug.matchedSignals.length,
    });

    const { audit: auditResult } = runSnapshotAudit(facts, profile, {
      pagesFetched: coverage.pagesFetched,
      maxPagesPlanned: coverage.maxPagesPlanned,
      playwrightUsed: coverage.playwrightUsed ?? false,
    });

    const htmlByUrl = new Map(pages.map(p => [p.finalUrl, p.html]));
    const urls = pages.map(p => p.finalUrl);
    const pagesCrawled = buildCrawledPages(urls, htmlByUrl, pages[0]!.finalUrl);

    const combinedHtml = pages.map(p => p.html).join('\n');
    const tech_stack = detectTechStackRecord(combinedHtml);

    const emails = new Set<string>();
    const phones = new Set<string>();
    const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const m = combinedHtml.match(emailRe);
    if (m) m.slice(0, 8).forEach(e => emails.add(e.toLowerCase()));

    const scannedAt = new Date().toISOString();
    const payload: SnapshotCachePayload = {
      version: 1,
      site_profile: profile,
      audit: auditResult,
      tech_stack,
      pages_crawled: pagesCrawled,
      scan_coverage: coverage,
      company_name: profile.companyNameGuess,
      location: profile.locationGuess,
      languages: facts.document.lang ? [facts.document.lang] : [],
      contact_info: {
        emails: [...emails],
        phones: [...phones],
        addresses: [],
      },
      scanned_at: scannedAt,
      classification_version: getClassificationRulesVersion(),
      fetch_strategy_version: SNAPSHOT_FETCH_STRATEGY_VERSION,
      snapshot_engine_version: SNAPSHOT_ENGINE_VERSION,
      ...(anomalyNotes.length > 0 ? { limitations: anomalyNotes } : {}),
    };

    await writeSnapshotCache(host, redactSnapshotPayloadForDomainCache(payload));
    await noteSnapshotFreshFetchCompleted(host);
    await persistFromCache(auditId, companyUrl, payload, {
      persistedFromDomainCache: false,
      redactContactInRecon: true,
    });

    const preview = buildPreviewFromPayload(auditId, token, companyUrl, payload, {
      fromDomainCache: false,
    });
    logSnapshotRunComplete({
      auditId,
      host,
      startedAt,
      outcome: 'fresh_completed',
      payload,
    });
    return { preview, profileDebug: debug };
  } finally {
    await releaseOnce();
  }
}

async function persistFromCache(
  auditId: string,
  companyUrl: string,
  p: SnapshotCachePayload,
  opts?: { persistedFromDomainCache?: boolean; redactContactInRecon?: boolean },
): Promise<void> {
  const domainRes = syntheticDomainResult(
    overallToLegacyScore(p.audit.overallScore),
    buildSummary(p),
    mapIssuesForDomain(p),
    mapQuickWinsForDomain(p),
  );

  await supabase
    .from('audit_recon')
    .update({
      status: 'completed',
      company_name: p.company_name,
      industry: p.site_profile.industry === 'unknown' ? null : p.site_profile.industry,
      location: p.location,
      languages: p.languages,
      tech_stack: p.tech_stack,
      social_profiles: {},
      contact_info:
        opts?.redactContactInRecon === true
          ? { emails: [], phones: [], addresses: [] }
          : p.contact_info,
      pages_crawled: p.pages_crawled,
    })
    .eq('audit_id', auditId);

  await supabase
    .from('audits')
    .update({
      company_name: p.company_name ?? undefined,
      industry: p.site_profile.industry === 'unknown' ? undefined : p.site_profile.industry,
      status: 'completed',
      current_phase: 4,
    })
    .eq('id', auditId);

  const payloadRow = {
    status: 'completed' as const,
    score: domainRes.score,
    label: domainRes.label,
    summary: domainRes.summary,
    strengths: domainRes.strengths,
    weaknesses: domainRes.weaknesses,
    issues: domainRes.issues,
    quick_wins: domainRes.quick_wins,
    recommendations: domainRes.recommendations,
    unknown_items: domainRes.unknown_items,
    confidence_distribution: domainRes.confidence_distribution,
    prompt_version: 'snapshot-deterministic-v1',
    raw_data: {
      snapshot_deterministic: {
        site_profile: toApiSiteProfile(p.site_profile),
        overall_score: p.audit.overallScore,
        category_scores: p.audit.categoryScores,
        scan_basis: p.audit.scanBasis,
        ...(p.audit.scanBasisCode ? { scan_basis_code: p.audit.scanBasisCode } : {}),
        signals_found: p.audit.signalsFound,
        scan_confidence_band: p.audit.scanConfidenceBand,
        classification_confidence_band: p.site_profile.classificationConfidenceBand,
        cache_hit: opts?.persistedFromDomainCache === true,
        ...(typeof p.audit.rulesCatalogVersion === 'number'
          ? { audit_rules_version: p.audit.rulesCatalogVersion }
          : {}),
        ...(p.scan_coverage ? { scan_coverage: toApiScanCoverage(p.scan_coverage) } : {}),
        ...(p.scanned_at ? { scanned_at: p.scanned_at } : {}),
        ...(p.limitations && p.limitations.length > 0 ? { limitations: p.limitations } : {}),
        ...(p.classification_version !== undefined ? { classification_version: p.classification_version } : {}),
        ...(p.fetch_strategy_version ? { fetch_strategy_version: p.fetch_strategy_version } : {}),
        ...(p.snapshot_engine_version ? { snapshot_engine_version: p.snapshot_engine_version } : {}),
      },
    },
  };

  const { data: updated } = await supabase
    .from('audit_domains')
    .update(payloadRow)
    .eq('audit_id', auditId)
    .eq('domain_key', 'ux_conversion')
    .eq('status', 'pending')
    .select('id');

  if (!(updated && updated.length > 0)) {
    const { data: latest } = await supabase
      .from('audit_domains')
      .select('version')
      .eq('audit_id', auditId)
      .eq('domain_key', 'ux_conversion')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    await supabase.from('audit_domains').insert({
      audit_id: auditId,
      domain_key: 'ux_conversion',
      phase_number: 4,
      version: (latest?.version ?? 1) + 1,
      ...payloadRow,
    });
  }
}

function buildSummary(p: SnapshotCachePayload): string {
  if (p.degraded) {
    const first = p.limitations?.[0] ?? 'Pages could not be loaded.';
    return `No automated GLC snapshot score — ${first}`;
  }
  const parts = [
    `Snapshot score ${p.audit.overallScore}/100 (${p.audit.scanConfidenceBand} confidence scan).`,
    p.site_profile.shortLabel ? `Profile: ${p.site_profile.shortLabel}.` : '',
  ];
  return parts.join(' ').trim();
}

export function toApiSiteProfile(p: SiteProfile): SnapshotSiteProfile {
  return { ...p };
}

export function toApiScanCoverage(c: SnapshotScanCoverage): SnapshotScanCoverageApi {
  return {
    budget_ms: c.budgetMs,
    elapsed_ms: c.elapsedMs,
    pages_fetched: c.pagesFetched,
    max_pages_planned: c.maxPagesPlanned,
    pages: c.pages.map(p => ({
      final_url: p.finalUrl,
      status: p.status,
      role: p.role,
    })),
    ...(c.playwrightEligible !== undefined ? { playwright_eligible: c.playwrightEligible } : {}),
    ...(c.playwrightUsed !== undefined ? { playwright_used: c.playwrightUsed } : {}),
    ...(c.robotsTxtFetched !== undefined ? { robots_txt_fetched: c.robotsTxtFetched } : {}),
    ...(c.robotsHomeDisallowed !== undefined ? { robots_home_disallowed: c.robotsHomeDisallowed } : {}),
    ...(c.robotsExtrasSkipped !== undefined ? { robots_extras_skipped: c.robotsExtrasSkipped } : {}),
    ...(c.crawlDelayMsApplied !== undefined ? { crawl_delay_ms_applied: c.crawlDelayMsApplied } : {}),
    ...(c.homeFetchFailure !== undefined ? { home_fetch_failure: c.homeFetchFailure } : {}),
    ...(c.challengeLikely === true ? { challenge_page_likely: true } : {}),
    ...(c.challengeTaxonomy ? { challenge_taxonomy: c.challengeTaxonomy } : {}),
    ...(c.parkedLikely === true ? { parked_domain_likely: true } : {}),
    ...(c.parkedTaxonomy ? { parked_taxonomy: c.parkedTaxonomy } : {}),
    ...(c.loginWallLikely === true ? { login_wall_likely: true } : {}),
    ...(c.loginWallTaxonomy ? { login_wall_taxonomy: c.loginWallTaxonomy } : {}),
  };
}

/** Shape stored under `audit_domains.raw_data.snapshot_deterministic` (and used by GET /api/snapshot merge). */
export function snapshotPayloadToDeterministicApiRecord(p: SnapshotCachePayload): Record<string, unknown> {
  return {
    site_profile: toApiSiteProfile(p.site_profile),
    overall_score: p.audit.overallScore,
    category_scores: p.audit.categoryScores,
    scan_basis: p.audit.scanBasis,
    ...(p.audit.scanBasisCode ? { scan_basis_code: p.audit.scanBasisCode } : {}),
    signals_found: p.audit.signalsFound,
    scan_confidence_band: p.audit.scanConfidenceBand,
    classification_confidence_band: p.site_profile.classificationConfidenceBand,
    ...(typeof p.audit.rulesCatalogVersion === 'number' ? { audit_rules_version: p.audit.rulesCatalogVersion } : {}),
    ...(p.scan_coverage ? { scan_coverage: toApiScanCoverage(p.scan_coverage) } : {}),
    ...(p.scanned_at ? { scanned_at: p.scanned_at } : {}),
    ...(p.limitations && p.limitations.length > 0 ? { limitations: p.limitations } : {}),
    ...(p.classification_version !== undefined ? { classification_version: p.classification_version } : {}),
    ...(p.fetch_strategy_version ? { fetch_strategy_version: p.fetch_strategy_version } : {}),
    ...(p.snapshot_engine_version ? { snapshot_engine_version: p.snapshot_engine_version } : {}),
  };
}

/** Legacy UX row fields + trimmed issues/wins for the public JSON preview. */
export function derivePublicUxFieldsFromSnapshotPayload(p: SnapshotCachePayload): {
  ux_score: number;
  ux_label: string;
  ux_summary: string;
  issues: FreeSnapshotPreview['issues'];
  quick_wins: FreeSnapshotPreview['quick_wins'];
} {
  const domainRes = syntheticDomainResult(
    overallToLegacyScore(p.audit.overallScore),
    buildSummary(p),
    mapIssuesForDomain(p),
    mapQuickWinsForDomain(p),
  );
  return {
    ux_score: domainRes.score,
    ux_label: domainRes.label,
    ux_summary: domainRes.summary,
    issues: domainRes.issues.slice(0, 2) as FreeSnapshotPreview['issues'],
    quick_wins: domainRes.quick_wins.slice(0, 2) as FreeSnapshotPreview['quick_wins'],
  };
}

function mapIssuesForDomain(p: SnapshotCachePayload): DomainResult['issues'] {
  if (p.degraded && p.limitations?.length) {
    return [
      {
        id: 'snapshot-degraded',
        severity: 'medium',
        title: 'Snapshot could not sample this website',
        description: p.limitations.join(' '),
        impact: 'Automated read was blocked or failed before scoring.',
        confidence: 'high',
        evidence_refs: p.limitations.map(finding => ({ type: 'snapshot_limitation', finding })),
        data_source: 'auto_detected',
      },
    ];
  }
  const catalog = getAuditRules();
  const byId = new Map(catalog.map(r => [r.id, r]));
  const rules = p.audit.ruleResults.filter(r => r.issueKey && r.status !== 'pass');
  const severityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const top = [...rules]
    .map(r => ({
      r,
      pri: severityRank[byId.get(r.id)?.severity ?? 'medium']! * r.maxScore,
    }))
    .sort((a, b) => b.pri - a.pri)
    .slice(0, 2)
    .map(x => x.r);
  if (top.length === 0) return [];
  return top.map(r => ({
    id: `snapshot-${r.id}`,
    severity: (byId.get(r.id)?.severity ?? 'medium') as import('../types/audit.js').AuditIssue['severity'],
    title: ISSUE_MESSAGES[r.issueKey!] ?? r.issueKey!,
    description: ISSUE_MESSAGES[r.issueKey!] ?? '',
    impact: 'Snapshot heuristic based on homepage and a few linked pages.',
    confidence: 'medium' as const,
    evidence_refs: r.evidence.slice(0, 5).map(finding => ({ type: 'snapshot_rule', finding })),
    data_source: 'auto_detected' as const,
  }));
}

function mapQuickWinsForDomain(p: SnapshotCachePayload): DomainResult['quick_wins'] {
  if (p.degraded) {
    return [
      {
        id: 'snapshot-qw-degraded',
        title: 'Fix robots.txt or availability',
        description:
          'Allow good-faith crawlers to read the homepage, or retry when the site responds reliably — then run the free check again.',
        effort: 'low' as const,
        timeframe: 'Same day',
      },
    ];
  }
  const issues = mapIssuesForDomain(p);
  return issues.slice(0, 2).map(iss => {
    const id = iss.id.replace('snapshot-', '');
    return {
      id: `snapshot-qw-${id}`,
      title: QUICK_WIN_MESSAGES[id] ?? 'Improve the highlighted area.',
      description: QUICK_WIN_MESSAGES[id] ?? '',
      effort: 'low' as const,
      timeframe: '1–7 days',
    };
  });
}

function buildPreviewFromPayload(
  auditId: string,
  token: string,
  companyUrl: string,
  p: SnapshotCachePayload,
  opts?: { fromDomainCache?: boolean },
): FreeSnapshotPreview {
  const fromDomainCache = opts?.fromDomainCache === true;
  const legacy = overallToLegacyScore(p.audit.overallScore);
  const label =
    legacy >= 4 ? 'Good' : legacy >= 3 ? 'Moderate' : legacy >= 2 ? 'Needs Work' : 'Critical';

  const issues = mapIssuesForDomain(p).slice(0, 2);
  const quickWins = mapQuickWinsForDomain(p).slice(0, 2);

  const scanBasisCode = fromDomainCache ? 'cache_hit' : p.audit.scanBasisCode;

  return {
    audit_id: auditId,
    snapshot_token: token,
    status: 'completed',
    company_url: companyUrl,
    company_name: p.company_name,
    tech_stack: p.tech_stack,
    location: p.location,
    ux_score: legacy,
    ux_label: label,
    ux_summary: buildSummary(p),
    issues: issues.length > 0 ? issues : syntheticDomainResult(legacy, buildSummary(p), [], []).issues.slice(0, 2),
    quick_wins: quickWins.length > 0 ? quickWins : syntheticDomainResult(legacy, buildSummary(p), [], []).quick_wins.slice(0, 2),
    overall_score: p.audit.overallScore,
    category_scores: p.audit.categoryScores as FreeSnapshotPreview['category_scores'],
    scan_basis: p.audit.scanBasis,
    signals_found: p.audit.signalsFound,
    scan_confidence_band: p.audit.scanConfidenceBand,
    site_profile: p.site_profile,
    classification_confidence_band: p.site_profile.classificationConfidenceBand,
    ...(typeof p.audit.rulesCatalogVersion === 'number'
      ? { audit_rules_version: p.audit.rulesCatalogVersion }
      : {}),
    ...(p.scan_coverage ? { scan_coverage: toApiScanCoverage(p.scan_coverage) } : {}),
    ...(scanBasisCode ? { scan_basis_code: scanBasisCode } : {}),
    cache_hit: fromDomainCache,
    ...(p.scanned_at ? { scanned_at: p.scanned_at } : {}),
    ...(p.limitations && p.limitations.length > 0 ? { limitations: p.limitations } : {}),
    ...(p.classification_version !== undefined ? { classification_version: p.classification_version } : {}),
    ...(p.fetch_strategy_version ? { fetch_strategy_version: p.fetch_strategy_version } : {}),
    ...(p.snapshot_engine_version ? { snapshot_engine_version: p.snapshot_engine_version } : {}),
  };
}
