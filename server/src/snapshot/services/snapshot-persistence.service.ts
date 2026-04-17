import { supabase } from '../../services/supabase.js';
import { logger } from '../../services/logger.js';
import { snapshotPayloadToAccessApiFields } from '../snapshot-access-state.js';
import type { SnapshotCachePayload } from '../types.js';
import { toApiScanCoverage } from '../mappers/snapshot-scan-coverage-api.mapper.js';
import { toApiSiteProfile } from '../mappers/snapshot-site-profile-api.mapper.js';
import { SNAPSHOT_DOMAIN_KEY, SNAPSHOT_PHASE_NUMBER, SNAPSHOT_PROMPT_VERSION } from '../config/snapshot-runtime.js';
import {
  buildSnapshotSummary,
  mapIssuesForDomain,
  mapQuickWinsForDomain,
  syntheticDomainResult,
} from '../domain/snapshot-domain-result.js';
import { overallToLegacyScore } from '../audit/run-audit.js';

export async function persistSnapshotCacheResult(
  auditId: string,
  p: SnapshotCachePayload,
  opts?: { persistedFromDomainCache?: boolean; redactContactInRecon?: boolean },
): Promise<void> {
  const domainRes = syntheticDomainResult(
    overallToLegacyScore(p.audit.overallScore),
    buildSnapshotSummary(p),
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
      contact_info: opts?.redactContactInRecon === true ? { emails: [], phones: [], addresses: [] } : p.contact_info,
      pages_crawled: p.pages_crawled,
    })
    .eq('audit_id', auditId);

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
    prompt_version: SNAPSHOT_PROMPT_VERSION,
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
        ...(typeof p.audit.rulesCatalogVersion === 'number' ? { audit_rules_version: p.audit.rulesCatalogVersion } : {}),
        ...(p.scan_coverage ? { scan_coverage: toApiScanCoverage(p.scan_coverage) } : {}),
        ...(p.scanned_at ? { scanned_at: p.scanned_at } : {}),
        ...(p.limitations && p.limitations.length > 0 ? { limitations: p.limitations } : {}),
        ...(p.classification_version !== undefined ? { classification_version: p.classification_version } : {}),
        ...(p.fetch_strategy_version ? { fetch_strategy_version: p.fetch_strategy_version } : {}),
        ...(p.snapshot_engine_version ? { snapshot_engine_version: p.snapshot_engine_version } : {}),
        ...(p.classification_transparency ? { classification_transparency: p.classification_transparency } : {}),
        ...(p.homepage_snippet ? { homepage_snippet: p.homepage_snippet } : {}),
        ...(p.tech_stack_tentative && p.tech_stack_tentative.length > 0 ? { tech_stack_tentative: p.tech_stack_tentative } : {}),
        ...(p.ai_visibility ? { ai_visibility: p.ai_visibility } : {}),
        ...snapshotPayloadToAccessApiFields({
          scanBasisCode: p.audit.scanBasisCode,
          limitations: p.limitations,
          scanCoverage: p.scan_coverage
            ? {
                pagesFetched: p.scan_coverage.pagesFetched,
                robotsHomeDisallowed: p.scan_coverage.robotsHomeDisallowed,
              }
            : undefined,
        }),
      },
    },
  };

  const { data: latestUxRows, error: uxSelectErr } = await supabase
    .from('audit_domains')
    .select('id, version')
    .eq('audit_id', auditId)
    .eq('domain_key', SNAPSHOT_DOMAIN_KEY)
    .order('version', { ascending: false })
    .limit(1);

  if (uxSelectErr) {
    logger.error('snapshot.persist_ux_select_failed', { component: 'snapshot', audit_id: auditId, error: uxSelectErr.message });
    throw new Error(uxSelectErr.message);
  }

  const latestUx = latestUxRows?.[0];
  if (latestUx?.id) {
    const { error: uxUpdErr } = await supabase.from('audit_domains').update(payloadRow).eq('id', latestUx.id);
    if (uxUpdErr) {
      logger.error('snapshot.persist_ux_update_failed', {
        component: 'snapshot',
        audit_id: auditId,
        domain_row_id: latestUx.id,
        error: uxUpdErr.message,
      });
      throw new Error(uxUpdErr.message);
    }
  } else {
    const { error: uxInsErr } = await supabase.from('audit_domains').insert({
      audit_id: auditId,
      domain_key: SNAPSHOT_DOMAIN_KEY,
      phase_number: SNAPSHOT_PHASE_NUMBER,
      version: 1,
      ...payloadRow,
    });
    if (uxInsErr) {
      logger.error('snapshot.persist_ux_insert_failed', { component: 'snapshot', audit_id: auditId, error: uxInsErr.message });
      throw new Error(uxInsErr.message);
    }
  }

  const { error: auditUpdErr } = await supabase
    .from('audits')
    .update({
      company_name: p.company_name ?? undefined,
      industry: p.site_profile.industry === 'unknown' ? undefined : p.site_profile.industry,
      status: 'completed',
      current_phase: SNAPSHOT_PHASE_NUMBER,
    })
    .eq('id', auditId);

  if (auditUpdErr) {
    logger.error('snapshot.persist_audit_completed_failed', { component: 'snapshot', audit_id: auditId, error: auditUpdErr.message });
    throw new Error(auditUpdErr.message);
  }
}
