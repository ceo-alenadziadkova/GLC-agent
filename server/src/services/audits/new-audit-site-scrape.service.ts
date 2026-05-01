/**
 * After POST /api/audits with a public URL, runs the same deterministic site scan as free snapshot
 * (fetch → facts → profile → rules), persists `collected_data.new_audit_site_recon` for agents + future mapping,
 * seeds `audit_recon` fields, and merges `recon_prefills` when `intake_brief` exists.
 */
import { COLLECTOR_KEY_NEW_AUDIT_SITE_RECON } from '../../config/collector-keys.js';
import { isNewAuditSiteScrapeEnabled } from '../../config/feature-flags.js';
import { SYSTEM_DEFAULTS } from '../../config/system-defaults.js';
import {
  acquireSnapshotFreshConcurrency,
  noteSnapshotFreshFetchCompleted,
  releaseSnapshotFreshConcurrency,
  SnapshotAtCapacityError,
} from '../../snapshot/abuse-guards.js';
import {
  readSnapshotCache,
  writeSnapshotCache,
  normalizeSnapshotHost,
  redactSnapshotPayloadForDomainCache,
} from '../../snapshot/cache.js';
import { buildDeterministicSnapshotPayload } from '../../snapshot/deterministic-site-scan-payload.js';
import { toApiSiteProfile } from '../../snapshot/mappers/snapshot-site-profile-api.mapper.js';
import type { SnapshotCachePayload } from '../../snapshot/types.js';
import { isNoPublicWebsiteUrl, NO_PUBLIC_WEBSITE_URL } from '../../config/no-public-website.js';
import { buildSuggestedBriefAnswersFromSnapshot } from '../../lib/suggested-brief-answers-from-snapshot.js';
import {
  buildBusinessActivityContext,
  detectAnalyticsFromTech,
  flattenTechStack,
  hostFromUrl,
  mapAudienceGuess,
  mapConversionToRevenueModel,
  nearestIndustry,
} from '../../lib/site-scrape-brief-hints.js';
import { logger } from '../logger.js';
import { supabase } from '../supabase.js';
import { writeReconPrefillsAfterPhase0 } from '../recon-prefill.js';

const UFP = SYSTEM_DEFAULTS.upgradeFreeSnapshotPrefill;

const SITE_RECON_PHASE = 0;

export type NewAuditSiteScrapeParams = {
  auditId: string;
  companyUrl: string;
  noPublicWebsite: boolean;
};

function scheduleOnNextTick(fn: () => Promise<void>): void {
  setImmediate(() => {
    void fn().catch((e) => {
      logger.warn('new_audit_site_scrape.unhandled', { error: (e as Error).message });
    });
  });
}

export function scheduleNewAuditSiteScrape(params: NewAuditSiteScrapeParams): void {
  if (!isNewAuditSiteScrapeEnabled()) {
    return;
  }
  if (params.noPublicWebsite) return;
  const url = params.companyUrl?.trim() ?? '';
  if (!url || url === NO_PUBLIC_WEBSITE_URL || isNoPublicWebsiteUrl(url)) {
    return;
  }

  scheduleOnNextTick(() => runNewAuditSiteScrapeWork(params));
}

async function runNewAuditSiteScrapeWork(params: NewAuditSiteScrapeParams): Promise<void> {
  const host = normalizeSnapshotHost(params.companyUrl);
  const cached = await readSnapshotCache(host);
  if (cached) {
    await persistNewAuditSiteReconData(params.auditId, params.companyUrl, cached, { fromDomainCache: true });
    return;
  }

  const { acquired, leaseId } = await acquireSnapshotFreshConcurrency();
  if (!acquired) {
    logger.warn('new_audit_site_scrape.capacity_skip', { auditId: params.auditId, host });
    return;
  }
  let released = false;
  const releaseOnce = async () => {
    if (!released) {
      released = true;
      await releaseSnapshotFreshConcurrency(leaseId);
    }
  };

  try {
    const { payload, profileDebug } = await buildDeterministicSnapshotPayload(params.companyUrl);
    if (!payload.degraded) {
      await writeSnapshotCache(host, redactSnapshotPayloadForDomainCache(payload));
      await noteSnapshotFreshFetchCompleted(host);
    }
    if (profileDebug) {
      logger.debug('new_audit_site_scrape.profile', {
        auditId: params.auditId,
        matched: profileDebug.matchedSignals.length,
      });
    }
    await persistNewAuditSiteReconData(params.auditId, params.companyUrl, payload, { fromDomainCache: false });
  } catch (e) {
    if (e instanceof SnapshotAtCapacityError) {
      logger.warn('new_audit_site_scrape.at_capacity', { auditId: params.auditId });
      return;
    }
    throw e;
  } finally {
    await releaseOnce();
  }
}

async function persistNewAuditSiteReconData(
  auditId: string,
  companyUrl: string,
  payload: SnapshotCachePayload,
  ctx: { fromDomainCache: boolean },
): Promise<void> {
  const spApi = toApiSiteProfile(payload.site_profile);
  const indLabel =
    spApi.industry && spApi.industry !== 'unknown' ? spApi.industry : null;
  const { industry: indGuess, specify: indSpecify } = nearestIndustry(indLabel);
  const tech = (payload.tech_stack ?? {}) as Record<string, string[]>;
  const activity = buildBusinessActivityContext({
    siteProfile: spApi as unknown as Record<string, unknown>,
    uxRowSummary: null,
  });
  const suggested_brief_answers = buildSuggestedBriefAnswersFromSnapshot(payload, activity.blurb);
  const ga = detectAnalyticsFromTech(tech);
  const hostLabel = hostFromUrl(companyUrl);

  const summary = {
    short_label: activity.shortLabel || null,
    industry_guess: indGuess,
    industry_specify_guess: indSpecify,
    company_name_guess: (payload.company_name as string | null) ?? spApi.companyNameGuess ?? null,
    host_label: hostLabel,
    analytics_likely: ga,
    overall_score: typeof payload.audit?.overallScore === 'number' ? payload.audit.overallScore : null,
    scanned_at: payload.scanned_at ?? new Date().toISOString(),
    degraded: payload.degraded === true,
    from_domain_cache: ctx.fromDomainCache,
  };

  const unmapped = {
    site_profile: spApi as unknown as Record<string, unknown>,
    category_scores: payload.audit?.categoryScores ?? null,
    signals_found: payload.audit?.signalsFound ?? null,
    scan_basis: payload.audit?.scanBasis ?? null,
    tech_stack_tentative: payload.tech_stack_tentative ?? null,
    classification_transparency: payload.classification_transparency ?? null,
    ai_visibility: payload.ai_visibility ?? null,
    scan_coverage: payload.scan_coverage ?? null,
    limitations: payload.limitations ?? null,
    homepage_snippet: payload.homepage_snippet ?? null,
    audience_guess_line: mapAudienceGuess(spApi.audienceGuess),
    revenue_model_hint: mapConversionToRevenueModel(spApi.conversionModel),
  };

  const prefillBlock = {
    snapshot_engine: 'deterministic' as const,
    detected_at: new Date().toISOString(),
    business_activity_summary: activity.blurb,
    tech_stack_flat: flattenTechStack(tech).slice(0, UFP.reconPrefillTechStackLinesMax),
    site_profile_short_label: summary.short_label,
    industry_guess: summary.industry_guess,
    industry_specify_guess: summary.industry_specify_guess,
    analytics_likely: summary.analytics_likely,
    overall_score_hint: summary.overall_score,
    unmapped,
    suggested_brief_answers,
  };

  const data: Record<string, unknown> = {
    version: 1,
    source: 'deterministic_site_scan',
    summary,
    unmapped,
    /** Same object merged into `intake_brief.recon_prefills.new_audit_site_recon` when present; used to backfill if the brief row is created after the scan. */
    recon_prefills_slice: prefillBlock,
  };

  const { error: cdErr } = await supabase.from('collected_data').upsert(
    {
      audit_id: auditId,
      collector_key: COLLECTOR_KEY_NEW_AUDIT_SITE_RECON,
      phase: SITE_RECON_PHASE,
      data,
    },
    { onConflict: 'audit_id,collector_key' },
  );
  if (cdErr) {
    logger.warn('new_audit_site_scrape.collected_data_failed', { auditId, error: cdErr.message });
  }

  const { error: reErr } = await supabase
    .from('audit_recon')
    .update({
      company_name:
        (payload.company_name as string | null | undefined) ??
        (spApi.shortLabel?.trim() ? spApi.shortLabel.trim() : null),
      industry: indGuess === 'Other' ? null : indGuess,
      location: (payload.location as string | null) ?? null,
      languages: (payload.languages as string[] | null) ?? [],
      tech_stack: tech,
      contact_info: {
        emails: [],
        phones: [],
        addresses: Array.isArray(payload.contact_info?.addresses) ? [...payload.contact_info.addresses] : [],
      },
      pages_crawled: (payload.pages_crawled as unknown[]) ?? [],
    })
    .eq('audit_id', auditId);
  if (reErr) {
    logger.warn('new_audit_site_scrape.audit_recon_failed', { auditId, error: reErr.message });
  }

  await writeReconPrefillsAfterPhase0(auditId, tech as Record<string, unknown>);
  await mergeNewAuditSiteReconPrefills(auditId, prefillBlock);
  logger.info('new_audit_site_scrape.completed', { auditId, fromCache: ctx.fromDomainCache, degraded: summary.degraded });
}

export type NewAuditSiteReconPrefillBlock = Record<string, unknown>;

async function mergeNewAuditSiteReconPrefills(auditId: string, prefillBlock: NewAuditSiteReconPrefillBlock): Promise<void> {
  const { data: row, error: selErr } = await supabase
    .from('intake_brief')
    .select('recon_prefills')
    .eq('audit_id', auditId)
    .maybeSingle();

  if (selErr) {
    logger.warn('new_audit_site_scrape.prefill_select_failed', { auditId, error: selErr.message });
    return;
  }
  if (!row) {
    return;
  }

  const prev = (row.recon_prefills as Record<string, unknown>) ?? {};
  const sug = prefillBlock.suggested_brief_answers as { a5?: string } | undefined;
  const next: Record<string, unknown> = {
    ...prev,
    new_audit_site_recon: prefillBlock,
    suggested_brief_answers: prefillBlock.suggested_brief_answers,
    ...(sug?.a5 !== undefined && sug.a5 !== '' ? { a5: sug.a5 } : {}),
  };

  const { error: upErr } = await supabase.from('intake_brief').update({ recon_prefills: next }).eq('audit_id', auditId);
  if (upErr) {
    logger.warn('new_audit_site_scrape.prefill_update_failed', { auditId, error: upErr.message });
  }
}

/**
 * Fetches stored new-audit site recon for recon agent context (read path).
 */
export async function loadNewAuditSiteReconData(auditId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('collected_data')
    .select('data')
    .eq('audit_id', auditId)
    .eq('collector_key', COLLECTOR_KEY_NEW_AUDIT_SITE_RECON)
    .maybeSingle();
  if (error || !data?.data) {
    return null;
  }
  return data.data as Record<string, unknown>;
}

/**
 * When the brief row is created after the site scan, copy `recon_prefills_slice` from `collected_data` once.
 */
export async function reconcileNewAuditSiteReconPrefillsIfNeeded(auditId: string): Promise<void> {
  const d = await loadNewAuditSiteReconData(auditId);
  const slice = d?.recon_prefills_slice as NewAuditSiteReconPrefillBlock | undefined;
  if (!slice || typeof slice !== 'object') {
    return;
  }
  const { data: row, error: selErr } = await supabase
    .from('intake_brief')
    .select('recon_prefills')
    .eq('audit_id', auditId)
    .maybeSingle();
  if (selErr || !row) {
    return;
  }
  const prev = (row.recon_prefills as Record<string, unknown>) ?? {};
  if (prev.new_audit_site_recon) {
    return;
  }
  const sug = slice.suggested_brief_answers as { a5?: string } | undefined;
  const { error: upErr } = await supabase
    .from('intake_brief')
    .update({
      recon_prefills: {
        ...prev,
        new_audit_site_recon: slice,
        suggested_brief_answers: slice.suggested_brief_answers,
        ...(sug?.a5 !== undefined && sug.a5 !== '' ? { a5: sug.a5 } : {}),
      },
    })
    .eq('audit_id', auditId);
  if (upErr) {
    logger.warn('new_audit_site_scrape.reconcile_prefill_failed', { auditId, error: upErr.message });
  }
}
