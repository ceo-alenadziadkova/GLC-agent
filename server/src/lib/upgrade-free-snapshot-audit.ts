/**
 * Promote a completed free_snapshot audit to package-based coverage pipeline.
 * Resets domain placeholders and intake state; optionally prefills brief from scraped recon + UX raw_data.
 */
import { supabase } from '../services/supabase.js';
import { saveBriefResponses } from '../services/brief-validator.js';
import {
  DOMAIN_PHASES,
  DEFAULT_AUDIT_PRODUCT_MODE,
  executionPlanToPhases,
  maxPhaseForExecutionPlan,
  reviewPhasesForExecutionPlan,
  type AuditCoveragePackage,
  type AuditExecutionPlan,
  type ProductMode,
} from '../types/audit.js';
import {
  isFreeSnapshotUpgradeEligibleAudit,
  persistedProductModeForExecutionPlan,
} from './audit-coverage-bridge.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import { UPGRADE_FREE_SNAPSHOT_CONTEXT_EN } from '../config/upgrade-free-snapshot-context.js';
import {
  buildBusinessActivityContext,
  detectAnalyticsFromTech,
  flattenTechStack,
  hostFromUrl,
  mapAudienceGuess,
  mapConversionToRevenueModel,
  nearestIndustry,
} from './site-scrape-brief-hints.js';
import { getSnapshotAccessBlockedFromDeterministic } from '../snapshot/snapshot-access-state.js';
import { logger } from '../services/logger.js';
import {
  API_ERROR_CODES,
  type ApiErrorCode,
  AUDITS_NOT_FOUND_MESSAGE,
  AUDITS_UPGRADE_ACCESS_DENIED_MESSAGE,
  AUDITS_UPGRADE_INIT_DOMAINS_FAILED_MESSAGE,
  AUDITS_UPGRADE_INIT_REVIEWS_FAILED_MESSAGE,
  AUDITS_UPGRADE_INIT_STRATEGY_FAILED_MESSAGE,
  AUDITS_UPGRADE_NOT_COMPLETED_MESSAGE,
  AUDITS_UPGRADE_NOT_FREE_SNAPSHOT_MESSAGE,
  AUDITS_UPGRADE_RESET_DOMAINS_FAILED_MESSAGE,
} from '../config/api-error-codes.js';
import { normalizeExecutionPlan } from '../services/execution-plan.js';

const UFP = SYSTEM_DEFAULTS.upgradeFreeSnapshotPrefill;
const UFCTX = UPGRADE_FREE_SNAPSHOT_CONTEXT_EN;

export type UpgradeFreeSnapshotAuditSuccess = {
  ok: true;
  /** Present when the client asked to carry scan context but the snapshot did not retrieve HTML (robots or fetch). */
  snapshot_scrape_limited?: true;
  snapshot_scrape_robots_blocked?: boolean;
};

export async function upgradeFreeSnapshotAudit(params: {
  auditId: string;
  actorUserId: string;
  coveragePackage?: AuditCoveragePackage;
  useScrapedContext: boolean;
}): Promise<
  UpgradeFreeSnapshotAuditSuccess | { ok: false; status: number; error: string; code: ApiErrorCode }
> {
  const { auditId, actorUserId, coveragePackage, useScrapedContext } = params;

  const { data: audit, error: aErr } = await supabase
    .from('audits')
    .select('id, product_mode, status, company_url, company_name, client_id, user_id, snapshot_token, execution_plan')
    .eq('id', auditId)
    .single();

  if (aErr || !audit) {
    return {
      ok: false,
      status: 404,
      code: API_ERROR_CODES.AUDITS_NOT_FOUND,
      error: AUDITS_NOT_FOUND_MESSAGE,
    };
  }

  if (
    !isFreeSnapshotUpgradeEligibleAudit({
      product_mode: audit.product_mode as string,
      snapshot_token: audit.snapshot_token as string | null,
      execution_plan: audit.execution_plan,
    })
  ) {
    return {
      ok: false,
      status: 400,
      code: API_ERROR_CODES.AUDITS_UPGRADE_NOT_FREE_SNAPSHOT,
      error: AUDITS_UPGRADE_NOT_FREE_SNAPSHOT_MESSAGE,
    };
  }
  if (audit.status !== 'completed') {
    return {
      ok: false,
      status: 400,
      code: API_ERROR_CODES.AUDITS_UPGRADE_NOT_COMPLETED,
      error: AUDITS_UPGRADE_NOT_COMPLETED_MESSAGE,
    };
  }

  const clientId = audit.client_id as string | null;
  const ownerId = audit.user_id as string;
  const canAct = clientId === actorUserId || ownerId === actorUserId;
  if (!canAct) {
    return {
      ok: false,
      status: 403,
      code: API_ERROR_CODES.AUDITS_UPGRADE_ACCESS_DENIED,
      error: AUDITS_UPGRADE_ACCESS_DENIED_MESSAGE,
    };
  }

  const resolvedCoveragePackage = coveragePackage ?? 'pro';
  const modeForFallback: ProductMode = resolvedCoveragePackage === 'complete' ? DEFAULT_AUDIT_PRODUCT_MODE : 'express';
  const executionPlan: AuditExecutionPlan = normalizeExecutionPlan(
    {
      coverage_package: resolvedCoveragePackage,
      source: 'user_selected',
    },
    modeForFallback,
  );
  const domainKeys = executionPlan.selected_domains;
  const reviewPhases = reviewPhasesForExecutionPlan(executionPlan);
  const nextMode: ProductMode = persistedProductModeForExecutionPlan(executionPlan);

  const { data: recon } = await supabase
    .from('audit_recon')
    .select('*')
    .eq('audit_id', auditId)
    .maybeSingle();

  const { data: uxRows } = await supabase
    .from('audit_domains')
    .select('raw_data, summary')
    .eq('audit_id', auditId)
    .eq('domain_key', 'ux_conversion')
    .order('version', { ascending: false })
    .limit(1);

  const rawData = uxRows?.[0]?.raw_data as Record<string, unknown> | undefined;
  const det = rawData?.snapshot_deterministic as Record<string, unknown> | undefined;
  const siteProfile = det?.site_profile as Record<string, unknown> | undefined;
  const snapshotAccess = getSnapshotAccessBlockedFromDeterministic(det);

  const techStack = (recon?.tech_stack as Record<string, string[]>) ?? {};
  const siteUrl = audit.company_url as string;

  const { error: delDomains } = await supabase.from('audit_domains').delete().eq('audit_id', auditId);
  if (delDomains) {
    logger.error('upgrade_snapshot.delete_domains_failed', { audit_id: auditId, error: delDomains.message });
    return {
      ok: false,
      status: 500,
      code: API_ERROR_CODES.AUDITS_UPGRADE_RESET_DOMAINS_FAILED,
      error: AUDITS_UPGRADE_RESET_DOMAINS_FAILED_MESSAGE,
    };
  }

  await supabase.from('review_points').delete().eq('audit_id', auditId);

  const domainInserts = domainKeys.map((key) => ({
    audit_id: auditId,
    domain_key: key,
    phase_number: DOMAIN_PHASES[key],
  }));

  const { error: insDom } = await supabase.from('audit_domains').insert(domainInserts);
  if (insDom) {
    logger.error('upgrade_snapshot.insert_domains_failed', { audit_id: auditId, error: insDom.message });
    return {
      ok: false,
      status: 500,
      code: API_ERROR_CODES.AUDITS_UPGRADE_INIT_DOMAINS_FAILED,
      error: AUDITS_UPGRADE_INIT_DOMAINS_FAILED_MESSAGE,
    };
  }

  const reviewInserts = reviewPhases.map(phase => ({
    audit_id: auditId,
    after_phase: phase,
  }));
  const { error: insRev } = await supabase.from('review_points').insert(reviewInserts);
  if (insRev) {
    logger.error('upgrade_snapshot.insert_reviews_failed', { audit_id: auditId, error: insRev.message });
    return {
      ok: false,
      status: 500,
      code: API_ERROR_CODES.AUDITS_UPGRADE_INIT_REVIEWS_FAILED,
      error: AUDITS_UPGRADE_INIT_REVIEWS_FAILED_MESSAGE,
    };
  }

  if (executionPlanToPhases(executionPlan).includes(7)) {
    const { data: strat } = await supabase.from('audit_strategy').select('id').eq('audit_id', auditId).maybeSingle();
    if (!strat) {
      const { error: sErr } = await supabase.from('audit_strategy').insert({ audit_id: auditId });
      if (sErr) {
        logger.error('upgrade_snapshot.insert_strategy_failed', { audit_id: auditId, error: sErr.message });
        return {
          ok: false,
          status: 500,
          code: API_ERROR_CODES.AUDITS_UPGRADE_INIT_STRATEGY_FAILED,
          error: AUDITS_UPGRADE_INIT_STRATEGY_FAILED_MESSAGE,
        };
      }
    }
  }

  if (!useScrapedContext) {
    const host = hostFromUrl(siteUrl);
    await supabase
      .from('audit_recon')
      .update({
        status: 'pending',
        company_name: null,
        industry: null,
        location: null,
        languages: [],
        tech_stack: {},
        social_profiles: {},
        contact_info: { emails: [], phones: [], addresses: [] },
        pages_crawled: [],
      })
      .eq('audit_id', auditId);

    await supabase
      .from('audits')
      .update({
        product_mode: nextMode,
        execution_plan: executionPlan,
        status: 'created',
        current_phase: 0,
        overall_score: null,
        tokens_used: 0,
        company_name: host,
        industry: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auditId);

    await saveBriefResponses(
      auditId,
      {
        a11: { value: siteUrl, source: 'client' },
        a12: { value: host, source: 'client' },
        a2: { value: 'Other', source: 'client' },
        intake_industry_specify: { value: UFCTX.intakeIndustryOtherPlaceholder, source: 'client' },
      },
      { collection_mode: 'self_serve' },
    );
  } else {
    const guessName =
      (recon?.company_name as string | null)?.trim()
      ?? (siteProfile?.companyNameGuess as string | null)?.trim()
      ?? (siteProfile?.shortLabel as string | null)?.trim()
      ?? hostFromUrl(siteUrl);

    const industrySource =
      (recon?.industry as string | null)?.trim()
      ?? (siteProfile?.industry as string | null)?.trim()
      ?? null;

    const { industry: ind, specify } = nearestIndustry(industrySource);
    const ga = detectAnalyticsFromTech(techStack);
    const techLines = flattenTechStack(techStack);
    const shortLabel = (siteProfile?.shortLabel as string | null)?.trim() ?? null;
    const uxRowSummary = (uxRows?.[0]?.summary as string | null | undefined) ?? null;
    const activity = buildBusinessActivityContext({ siteProfile, uxRowSummary });

    const reconPrefills = {
      snapshot_upgrade: true,
      detected_at: new Date().toISOString(),
      tech_stack_flat: techLines.slice(0, UFP.reconPrefillTechStackLinesMax),
      site_profile_short_label: shortLabel,
      ...(typeof det?.overall_score === 'number' && !snapshotAccess.showCallout
        ? { overall_score_hint: det.overall_score }
        : {}),
      ...(snapshotAccess.showCallout
        ? {
            snapshot_scrape_limited: true,
            snapshot_scrape_robots_blocked: snapshotAccess.robotsBlocked,
            snapshot_scrape_note: snapshotAccess.robotsBlocked
              ? UFCTX.snapshotScrapeNoteRobotsBlocked
              : UFCTX.snapshotScrapeNoteOther,
          }
        : {}),
      ...(activity.blurb ? { business_activity_summary: activity.blurb } : {}),
      ...(activity.primaryOffer ? { site_profile_primary_offer: activity.primaryOffer } : {}),
      ...(activity.conversionHuman
        ? { site_profile_conversion_human: activity.conversionHuman }
        : {}),
      ...(String(siteProfile?.conversionModel ?? '')
        ? { site_profile_conversion_model_id: String(siteProfile?.conversionModel) }
        : {}),
      ...(String(siteProfile?.audienceGuess ?? '')
        ? { site_profile_audience_guess: String(siteProfile?.audienceGuess) }
        : {}),
    };

    await supabase
      .from('audits')
      .update({
        product_mode: nextMode,
        execution_plan: executionPlan,
        status: 'created',
        current_phase: 0,
        overall_score: null,
        tokens_used: 0,
        company_name: guessName,
        industry: ind === 'Other' ? null : ind,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auditId);

    const responses: Record<string, unknown> = {
      a11: { value: siteUrl, source: 'recon_confirmed' },
      a12: { value: guessName, source: 'recon_confirmed' },
      a2: { value: ind, source: 'recon_confirmed' },
    };
    if (ind === 'Other' && specify) {
      responses.intake_industry_specify = { value: specify, source: 'recon_confirmed' };
    }
    if (ga) {
      responses.c3 = { value: 'Yes, GA4', source: 'recon_confirmed' };
    }
    if (activity.blurb) {
      responses.f1 = { value: ['Other'], source: 'recon_confirmed' };
      responses.f1__other = {
        value: UFCTX.f1OtherDraftPrefix + activity.blurb,
        source: 'recon_confirmed',
      };
    }
    const audienceLine = mapAudienceGuess(siteProfile?.audienceGuess);
    if (audienceLine) {
      responses.b1 = { value: audienceLine, source: 'recon_confirmed' };
    }
    const revenuePick = mapConversionToRevenueModel(siteProfile?.conversionModel);
    if (revenuePick) {
      responses.a10 = { value: [revenuePick], source: 'recon_confirmed' };
    }

    await saveBriefResponses(auditId, responses, { collection_mode: 'self_serve' });

    const { data: briefAfter } = await supabase
      .from('intake_brief')
      .select('recon_prefills')
      .eq('audit_id', auditId)
      .maybeSingle();
    const priorPrefills =
      briefAfter?.recon_prefills && typeof briefAfter.recon_prefills === 'object' && !Array.isArray(briefAfter.recon_prefills)
        ? (briefAfter.recon_prefills as Record<string, unknown>)
        : {};
    await supabase
      .from('intake_brief')
      .update({
        recon_prefills: { ...priorPrefills, ...reconPrefills },
      })
      .eq('audit_id', auditId);
  }

  const responseScrapeLimited =
    useScrapedContext && snapshotAccess.showCallout
      ? ({
          snapshot_scrape_limited: true as const,
          snapshot_scrape_robots_blocked: snapshotAccess.robotsBlocked,
        } satisfies Pick<UpgradeFreeSnapshotAuditSuccess, 'snapshot_scrape_limited' | 'snapshot_scrape_robots_blocked'>)
      : {};

  logger.info('upgrade_snapshot.completed', {
    audit_id: auditId,
    product_mode: nextMode,
    coverage_package: resolvedCoveragePackage,
    max_phase: maxPhaseForExecutionPlan(executionPlan),
    use_scraped_context: useScrapedContext,
    snapshot_scrape_limited: useScrapedContext && snapshotAccess.showCallout,
    snapshot_scrape_robots_blocked:
      useScrapedContext && snapshotAccess.showCallout && snapshotAccess.robotsBlocked,
  });

  return { ok: true, ...responseScrapeLimited };
}
