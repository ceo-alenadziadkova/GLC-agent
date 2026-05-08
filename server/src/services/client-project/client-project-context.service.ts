import type { IntakeVersionTuple } from '@glc/intake-core';

import type { LighthouseAuditSummary } from '../../lib/lighthouse-audit.js';
import { fetchBriefByAuditId } from '../../repositories/audits/audit-brief.repository.js';
import { fetchCollectedDataRowsForAudit } from '../../repositories/audits/collected-data-for-audit.repository.js';
import { logger } from '../logger.js';
import { mergeLighthouseBootstrapIntoReconPrefills } from '../audits/new-audit-lighthouse-bootstrap.service.js';
import { reconcileNewAuditSiteReconPrefillsIfNeeded } from '../audits/new-audit-site-scrape.service.js';
import { buildClientProjectEnrichmentFromCollectedData } from './client-project-collected-enrichment.js';
import type {
  ClientProjectAuditEnrichmentV1,
  ClientProjectContextV1,
  ClientProjectNarrativeV1,
  ClientProjectBankResponses,
} from '../../types/audit/client-project-context.js';
import { CLIENT_PROJECT_CONTEXT_VERSION } from '../../types/audit/client-project-context.js';

export type BuildClientProjectContextV1Options = {
  projectNarrative?: ClientProjectNarrativeV1 | null;
  auditEnrichment?: ClientProjectAuditEnrichmentV1;
  /** Defaults to `new Date().toISOString()` when the brief has no `updated_at`. */
  assembledAt?: string;
  /**
   * When `true` (default), merge a small public-safe snapshot from `collected_data` (e.g. Lighthouse
   * on the `performance` row) into `auditEnrichment`.
   */
  includeCollectedDataEnrichment?: boolean;
};

type BriefRowForContext = {
  audit_id: string;
  responses: unknown;
  intake_versions?: IntakeVersionTuple | null;
  updated_at?: string;
};

/**
 * Coerces persisted `responses` jsonb to the client-project map shape; non-objects become `{}`.
 */
export function normalizeClientProjectBankResponses(raw: unknown): ClientProjectBankResponses {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  return raw as ClientProjectBankResponses;
}

/**
 * Pure builder: one {@link ClientProjectContextV1} from a brief-shaped row. SSOT for cells remains `intake_brief`.
 */
export function buildClientProjectContextV1FromBriefRow(
  row: BriefRowForContext,
  options?: BuildClientProjectContextV1Options,
): ClientProjectContextV1 {
  const assembledAt = options?.assembledAt ?? new Date().toISOString();
  return {
    version: CLIENT_PROJECT_CONTEXT_VERSION,
    auditId: row.audit_id,
    intakeVersionTuple: row.intake_versions ?? null,
    bankResponses: normalizeClientProjectBankResponses(row.responses),
    projectNarrative: options?.projectNarrative ?? null,
    auditEnrichment: options?.auditEnrichment ?? {},
    updatedAt: row.updated_at ?? assembledAt,
  };
}

/**
 * Loads `intake_brief` for the audit and builds {@link ClientProjectContextV1}.
 * Returns `null` when there is no brief row.
 * Optionally enriches from `collected_data` (see `includeCollectedDataEnrichment`).
 */
export async function loadClientProjectContextForAuditId(
  auditId: string,
  options?: BuildClientProjectContextV1Options,
): Promise<ClientProjectContextV1 | null> {
  const { data, error } = await fetchBriefByAuditId(auditId);
  if (error || !data) {
    return null;
  }
  const row = data as BriefRowForContext;
  const includeCollected = options?.includeCollectedDataEnrichment !== false;
  let collectedEnrichment: ClientProjectAuditEnrichmentV1 = {};
  if (includeCollected) {
    const { rows, error: colErr } = await fetchCollectedDataRowsForAudit(auditId);
    if (colErr) {
      logger.warn('client_project_context.collected_data_fetch_failed', {
        component: 'client_project_context',
        auditId,
        error: colErr.message,
      });
    } else {
      collectedEnrichment = buildClientProjectEnrichmentFromCollectedData(rows);
      const pre = (row as { recon_prefills?: unknown }).recon_prefills;
      const preObj = pre && typeof pre === 'object' && !Array.isArray(pre) ? (pre as Record<string, unknown>) : null;
      const hasLighthousePref = Boolean(preObj?.lighthouse_bootstrap);
      if (!hasLighthousePref) {
        const boot = rows.find((r) => r.collector_key === 'lighthouse_bootstrap');
        const rawL = boot?.data?.lighthouse;
        if (rawL && typeof rawL === 'object' && !Array.isArray(rawL)) {
          const o = rawL as { error?: unknown };
          if (!(typeof o.error === 'string' && o.error)) {
            void mergeLighthouseBootstrapIntoReconPrefills(auditId, rawL as LighthouseAuditSummary);
          }
        }
      }
      void reconcileNewAuditSiteReconPrefillsIfNeeded(auditId);
    }
  }
  const mergedByKey: Record<string, unknown> = {
    ...collectedEnrichment.byKey,
    ...options?.auditEnrichment?.byKey,
  };
  const auditEnrichment: ClientProjectAuditEnrichmentV1 =
    Object.keys(mergedByKey).length > 0 ? { byKey: mergedByKey } : {};
  return buildClientProjectContextV1FromBriefRow(row, {
    ...options,
    auditEnrichment,
  });
}

/**
 * Snapshot from `collected_data` (Lighthouse bootstrap, new-audit site scan) without a brief row.
 * Used to poll new-audit background jobs before the first `intake_brief` save.
 */
export async function loadCollectedDataPrecheckForAuditId(
  auditId: string,
): Promise<ClientProjectAuditEnrichmentV1> {
  const { rows, error: colErr } = await fetchCollectedDataRowsForAudit(auditId);
  if (colErr) {
    logger.warn('client_project_context.precheck_fetch_failed', {
      component: 'client_project_context',
      auditId,
      error: colErr.message,
    });
    return {};
  }
  return buildClientProjectEnrichmentFromCollectedData(rows);
}
