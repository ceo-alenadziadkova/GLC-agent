/**
 * Orchestrates deterministic free snapshot: tiered fetch, facts, site profile, audit rules, persist recon + UX row.
 */
import { logger } from '../../services/logger.js';
import { supabase } from '../../services/supabase.js';
import type { FreeSnapshotPreview } from '../../types/audit.js';
import { detectTechStackRecord } from '../../lib/site-html-signals.js';
import { inferTechStackTentative } from '../../lib/tech-stack-tentative.js';
import { runSnapshotAudit } from '../audit/run-audit.js';
import { getAuditRulesCatalogVersion } from '../audit/parse-audit-rules.js';
import {
  acquireSnapshotFreshConcurrency,
  noteSnapshotFreshFetchCompleted,
  releaseSnapshotFreshConcurrency,
  SnapshotAtCapacityError,
} from '../abuse-guards.js';
import { SNAPSHOT_DEGRADED_EMPTY_PAGES_SCAN_BASIS } from '../config/snapshot-limitations.en.js';
import { runSiteProfile, type SiteProfileDebug } from '../classification/site-profile-runner.js';
import { getClassificationRulesVersion } from '../classification/parse-rules.js';
import {
  readSnapshotCache,
  writeSnapshotCache,
  normalizeSnapshotHost,
  redactSnapshotPayloadForDomainCache,
} from '../cache.js';
import { buildCrawledPages, buildMinimalPage } from '../domain/crawled-pages-from-html.js';
import { buildHomepageSnippet } from '../domain/homepage-snippet.js';
import {
  applyRobotsFallbackProfileNotes,
  buildDegradedLimitations,
  buildRobotsPartialScanLimitations,
} from '../domain/snapshot-coverage-limitations.js';
import { buildUnknownSiteProfile } from '../domain/unknown-site-profile.js';
import { deriveAiVisibilityGaps } from '../ai-visibility-hints.js';
import { buildEmptyFacts, extractFacts } from '../extract-facts.js';
import { fetchTieredPages } from '../fetch-tiered.js';
import { extractContactEmailsFromHtml } from '../lib/extract-contact-emails-from-html.js';
import { classificationTransparencyFromDebug } from '../mappers/snapshot-deterministic-api.mapper.js';
import { buildPreviewFromPayload } from '../mappers/free-preview-from-payload.mapper.js';
import { logSnapshotRunComplete } from '../observability/snapshot-run-telemetry.js';
import { anomalyLimitationMessages } from '../page-anomaly.js';
import { persistSnapshotCacheResult } from './snapshot-persistence.service.js';
import {
  SNAPSHOT_ENGINE_VERSION,
  SNAPSHOT_FETCH_STRATEGY_VERSION,
} from '../snapshot-versions.js';
import type { SnapshotAuditResult, SnapshotCachePayload } from '../types.js';
import { SnapshotFactsSchema } from '../types.js';

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
    await persistSnapshotCacheResult(auditId, cached, {
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
      const auditResult: SnapshotAuditResult = {
        overallScore: 0,
        categoryScores: {
          ux_clarity: 0,
          conversion_readiness: 0,
          ai_readiness: 0,
          technical_basics: 0,
        },
        ruleResults: [],
        scanBasis: SNAPSHOT_DEGRADED_EMPTY_PAGES_SCAN_BASIS,
        scanBasisCode: 'degraded',
        signalsFound: [],
        scanConfidenceBand: 'low',
        rulesCatalogVersion: getAuditRulesCatalogVersion(),
      };
      const degradedPayload: SnapshotCachePayload = {
        version: 1,
        site_profile: unknownProfile,
        audit: auditResult,
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
        ai_visibility: { gaps: deriveAiVisibilityGaps(buildEmptyFacts(companyUrl), coverage) },
      };
      await persistSnapshotCacheResult(auditId, degradedPayload, {
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

    const rawFacts = extractFacts(pages, baseHref, {
      ...(coverage.robotsHomeDisallowed ? { canonicalHomepageUrl: baseHref } : {}),
    });
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
    const robotsPartialNotes = buildRobotsPartialScanLimitations(coverage);
    const limitationNotes = [...anomalyNotes, ...robotsPartialNotes];

    const { profile: siteProfile, debug } = runSiteProfile(facts);
    const profile = applyRobotsFallbackProfileNotes(siteProfile, coverage);
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
    const tech_stack = detectTechStackRecord(combinedHtml, { pageUrls: pages.map(p => p.finalUrl) });
    const tech_stack_tentative = inferTechStackTentative(combinedHtml, tech_stack);

    const emails = extractContactEmailsFromHtml(combinedHtml);
    const phones: string[] = [];

    const scannedAt = new Date().toISOString();
    const homepage_snippet = buildHomepageSnippet(facts);
    const payload: SnapshotCachePayload = {
      version: 1,
      site_profile: profile,
      audit: auditResult,
      tech_stack,
      ...(tech_stack_tentative.length > 0 ? { tech_stack_tentative } : {}),
      pages_crawled: pagesCrawled,
      scan_coverage: coverage,
      company_name: profile.companyNameGuess,
      location: profile.locationGuess,
      languages: facts.document.lang ? [facts.document.lang] : [],
      contact_info: {
        emails,
        phones,
        addresses: [],
      },
      scanned_at: scannedAt,
      classification_version: getClassificationRulesVersion(),
      fetch_strategy_version: SNAPSHOT_FETCH_STRATEGY_VERSION,
      snapshot_engine_version: SNAPSHOT_ENGINE_VERSION,
      ai_visibility: { gaps: deriveAiVisibilityGaps(facts, coverage) },
      ...(homepage_snippet ? { homepage_snippet } : {}),
      ...(limitationNotes.length > 0 ? { limitations: limitationNotes } : {}),
      classification_transparency: classificationTransparencyFromDebug(debug),
    };

    await writeSnapshotCache(host, redactSnapshotPayloadForDomainCache(payload));
    await noteSnapshotFreshFetchCompleted(host);
    await persistSnapshotCacheResult(auditId, payload, {
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
