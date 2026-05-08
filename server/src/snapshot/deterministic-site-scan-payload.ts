/**
 * Shared deterministic fetch → facts → site profile → audit rules → SnapshotCachePayload.
 * Used by free snapshot and by new-audit pre-scrape (without snapshot-specific persistence to `audits`).
 */
import { detectTechStackRecord } from '../lib/site-html-signals.js';
import { inferTechStackTentative } from '../lib/tech-stack-tentative.js';
import { runSnapshotAudit } from './audit/run-audit.js';
import { getAuditRulesCatalogVersion } from './audit/parse-audit-rules.js';
import { SNAPSHOT_DEGRADED_EMPTY_PAGES_SCAN_BASIS } from './config/snapshot-limitations.en.js';
import { runSiteProfile, type SiteProfileDebug } from './classification/site-profile-runner.js';
import { getClassificationRulesVersion } from './classification/parse-rules.js';
import { buildCrawledPages, buildMinimalPage } from './domain/crawled-pages-from-html.js';
import { buildHomepageSnippet } from './domain/homepage-snippet.js';
import {
  applyRobotsFallbackProfileNotes,
  buildDegradedLimitations,
  buildRobotsPartialScanLimitations,
} from './domain/snapshot-coverage-limitations.js';
import { buildUnknownSiteProfile } from './domain/unknown-site-profile.js';
import { deriveAiVisibilityGaps } from './ai-visibility-hints.js';
import { buildEmptyFacts, extractFacts } from './extract-facts.js';
import { fetchTieredPages } from './fetch-tiered.js';
import { extractContactEmailsFromHtml } from './lib/extract-contact-emails-from-html.js';
import { extractPublicAddressFromHtml } from './lib/extract-public-address-from-html.js';
import { classificationTransparencyFromDebug } from './mappers/snapshot-deterministic-api.mapper.js';
import { anomalyLimitationMessages } from './page-anomaly.js';
import { SNAPSHOT_ENGINE_VERSION, SNAPSHOT_FETCH_STRATEGY_VERSION } from './snapshot-versions.js';
import type { SnapshotAuditResult, SnapshotCachePayload } from './types.js';
import { SnapshotFactsSchema } from './types.js';
import { logger } from '../services/logger.js';

export type DeterministicSiteScanPayloadResult = {
  payload: SnapshotCachePayload;
  profileDebug: SiteProfileDebug | undefined;
};

/**
 * Fetches and classifies a public URL into a `SnapshotCachePayload` (in-memory; no cache write / no DB).
 */
export async function buildDeterministicSnapshotPayload(companyUrl: string): Promise<DeterministicSiteScanPayloadResult> {
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
      recon_hints: { checkout_html: false },
      scanned_at: scannedAt,
      limitations,
      degraded: true,
      classification_version: getClassificationRulesVersion(),
      fetch_strategy_version: SNAPSHOT_FETCH_STRATEGY_VERSION,
      snapshot_engine_version: SNAPSHOT_ENGINE_VERSION,
      ai_visibility: { gaps: deriveAiVisibilityGaps(buildEmptyFacts(companyUrl), coverage) },
    };
    return { payload: degradedPayload, profileDebug: undefined };
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
  const firstUrl = pages[0]?.finalUrl ?? companyUrl;
  const pagesCrawled = buildCrawledPages(urls, htmlByUrl, firstUrl);

  const combinedHtml = pages.map(p => p.html).join('\n');
  const firstPageHtml = pages[0]?.html ?? '';
  const tech_stack = detectTechStackRecord(combinedHtml, { pageUrls: pages.map(p => p.finalUrl) });
  const tech_stack_tentative = inferTechStackTentative(combinedHtml, tech_stack);

  const emails = extractContactEmailsFromHtml(combinedHtml);
  const phones: string[] = [];
  const footerOrSchemaAddress = extractPublicAddressFromHtml(firstPageHtml || combinedHtml);
  const recon_hints = {
    checkout_html: /\/checkout\b|add\s+to\s+cart|shopping\s+cart|\/cart\b|buy\s+now|pay\s+now|paypal\.com|stripe\.com\/(checkout|v3|js)/i.test(
      combinedHtml,
    ),
  };

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
      addresses: footerOrSchemaAddress ? [footerOrSchemaAddress] : [],
    },
    recon_hints,
    scanned_at: scannedAt,
    classification_version: getClassificationRulesVersion(),
    fetch_strategy_version: SNAPSHOT_FETCH_STRATEGY_VERSION,
    snapshot_engine_version: SNAPSHOT_ENGINE_VERSION,
    ai_visibility: { gaps: deriveAiVisibilityGaps(facts, coverage) },
    ...(homepage_snippet ? { homepage_snippet } : {}),
    ...(limitationNotes.length > 0 ? { limitations: limitationNotes } : {}),
    classification_transparency: classificationTransparencyFromDebug(debug),
  };

  return { payload, profileDebug: debug };
}
