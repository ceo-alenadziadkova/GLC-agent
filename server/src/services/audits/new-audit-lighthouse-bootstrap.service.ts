/**
 * On POST /api/audits, when a public site URL is present, optionally run Lighthouse early (before
 * the full pipeline) so `collected_data` and `recon_prefills` can surface scores without waiting for a snapshot.
 */
import { isNoPublicWebsiteUrl, NO_PUBLIC_WEBSITE_URL } from '../../config/no-public-website.js';
import { COLLECTOR_KEY_LIGHTHOUSE_BOOTSTRAP } from '../../config/collector-keys.js';
import { isNewAuditLighthouseBootstrapEnabled } from '../../config/feature-flags.js';
import { auditLighthouseBudgetMs, auditLighthouseEnabled } from '../../lib/audit-deep-scan-env.js';
import { runLighthouseAuditSummary, type LighthouseAuditSummary } from '../../lib/lighthouse-audit.js';
import { PublicUrlNotAllowedError, validatePublicAuditUrl } from '../../lib/public-http-url.js';
import { logger } from '../logger.js';
import { supabase } from '../supabase.js';
import {
  buildLighthouseBankPrefillHints,
  buildLighthouseBootstrapSummaryLine,
} from './lighthouse-bootstrap-bank-prefill.js';

const BOOTSTRAP_PHASE = 0;

export type NewAuditLighthouseBootstrapParams = {
  auditId: string;
  companyUrl: string;
  noPublicWebsite: boolean;
};

function scheduleOnNextTick(fn: () => Promise<void>): void {
  setImmediate(() => {
    void fn().catch((e) => {
      logger.warn('new_audit_lighthouse_bootstrap.unhandled', {
        error: (e as Error).message,
      });
    });
  });
}

/**
 * After successful audit create: runs Lighthouse in the background (no await in HTTP path).
 * Idempotent: upserts a single `lighthouse_bootstrap` `collected_data` row.
 */
export function scheduleNewAuditLighthouseBootstrap(params: NewAuditLighthouseBootstrapParams): void {
  if (!isNewAuditLighthouseBootstrapEnabled() || !auditLighthouseEnabled()) {
    return;
  }
  if (params.noPublicWebsite) return;
  const url = params.companyUrl?.trim() ?? '';
  if (!url || url === NO_PUBLIC_WEBSITE_URL || isNoPublicWebsiteUrl(url)) {
    return;
  }

  scheduleOnNextTick(async () => {
    let lh: LighthouseAuditSummary | null = null;
    try {
      await validatePublicAuditUrl(url);
    } catch (e) {
      if (e instanceof PublicUrlNotAllowedError) {
        logger.info('new_audit_lighthouse_bootstrap.url_not_allowed', { auditId: params.auditId });
        return;
      }
      throw e;
    }

    logger.info('new_audit_lighthouse_bootstrap.lighthouse_start', { auditId: params.auditId, companyUrl: url });
    try {
      lh = await runLighthouseAuditSummary(url, auditLighthouseBudgetMs());
    } catch (e) {
      logger.warn('new_audit_lighthouse_bootstrap.lighthouse_failed', {
        auditId: params.auditId,
        error: (e as Error).message,
      });
    }

    if (!lh) {
      return;
    }

    const data: Record<string, unknown> = {
      lighthouse: {
        enabled: true,
        ...lh,
        new_audit_bootstrap: true,
      },
      new_audit_bootstrap: true,
    };

    const { error: upErr } = await supabase.from('collected_data').upsert(
      {
        audit_id: params.auditId,
        collector_key: COLLECTOR_KEY_LIGHTHOUSE_BOOTSTRAP,
        phase: BOOTSTRAP_PHASE,
        data,
      },
      { onConflict: 'audit_id,collector_key' },
    );

    if (upErr) {
      logger.warn('new_audit_lighthouse_bootstrap.collected_data_failed', {
        auditId: params.auditId,
        error: upErr.message,
      });
    } else {
      logger.info('new_audit_lighthouse_bootstrap.finished', {
        auditId: params.auditId,
        performance_score: lh.performance_score,
      });
    }

    if (!lh.error) {
      await mergeLighthouseBootstrapIntoReconPrefills(params.auditId, lh);
    }
  });
}

/**
 * Suggested bank hints in `recon_prefills` (f2 / f3) — only fills empty slots for those keys, never overwrites.
 */
export async function mergeLighthouseBootstrapIntoReconPrefills(
  auditId: string,
  lh: LighthouseAuditSummary,
): Promise<void> {
  const summary = buildLighthouseBootstrapSummaryLine(lh).trim();
  const hints = buildLighthouseBankPrefillHints(lh);

  const { data: row, error: selErr } = await supabase
    .from('intake_brief')
    .select('recon_prefills')
    .eq('audit_id', auditId)
    .maybeSingle();

  if (selErr) {
    logger.warn('new_audit_lighthouse_bootstrap.prefill_select_failed', { auditId, error: selErr.message });
    return;
  }
  if (!row) {
    // Brief row is created on first save; scores still live in `collected_data`.
    return;
  }

  const prev = (row.recon_prefills as Record<string, unknown>) ?? {};
  const existingBootstrap = (prev.lighthouse_bootstrap as Record<string, unknown> | undefined) ?? {};
  const next: Record<string, unknown> = {
    ...prev,
    lighthouse_bootstrap: {
      ...existingBootstrap,
      summary: summary || existingBootstrap.summary,
      f2_suggested_options: hints.f2_suggested_options,
      f3_suggested_option: hints.f3_suggested_option,
      suggestion_reasons: hints.reasons,
      updated_at: new Date().toISOString(),
    },
  };

  const { error: upErr } = await supabase
    .from('intake_brief')
    .update({ recon_prefills: next })
    .eq('audit_id', auditId);

  if (upErr) {
    logger.warn('new_audit_lighthouse_bootstrap.prefill_update_failed', { auditId, error: upErr.message });
  }
}

function lighthouseSummaryFromStored(o: Record<string, unknown>): LighthouseAuditSummary {
  return {
    requested_url: typeof o.requested_url === 'string' ? o.requested_url : '',
    performance_score: typeof o.performance_score === 'number' ? o.performance_score : null,
    accessibility_score: typeof o.accessibility_score === 'number' ? o.accessibility_score : null,
    best_practices_score: typeof o.best_practices_score === 'number' ? o.best_practices_score : null,
    seo_score: typeof o.seo_score === 'number' ? o.seo_score : null,
    lcp: typeof o.lcp === 'string' ? o.lcp : null,
    cls: typeof o.cls === 'string' ? o.cls : null,
    fcp: typeof o.fcp === 'string' ? o.fcp : null,
    ...(typeof o.error === 'string' && o.error ? { error: o.error } : {}),
  };
}

/** Loads bootstrap Lighthouse for reuse in the performance collector (avoids a second run while fresh). */
export async function loadFreshLighthouseBootstrapForReuse(
  auditId: string,
  maxAgeMs: number,
): Promise<{ summary: LighthouseAuditSummary; createdAt: number } | null> {
  const { data, error } = await supabase
    .from('collected_data')
    .select('data, created_at')
    .eq('audit_id', auditId)
    .eq('collector_key', COLLECTOR_KEY_LIGHTHOUSE_BOOTSTRAP)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  const created = data.created_at != null ? Date.parse(String(data.created_at)) : Number.NaN;
  if (!Number.isFinite(created) || Date.now() - created > maxAgeMs) {
    return null;
  }
  const raw = (data.data as Record<string, unknown>)?.lighthouse;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.error === 'string' && o.error) {
    return null;
  }
  return {
    summary: lighthouseSummaryFromStored(o),
    createdAt: created,
  };
}
