import type { UserRole } from '../../middleware/auth.js';
import { AUDITS_LIST_DEFAULT_LIMIT, AUDITS_LIST_MAX_LIMIT } from '../../config/audits-list-limits.js';
import { listAuditsByUser, fetchAuditByIdForUser, fetchAuditRelatedReadModel } from '../../repositories/audits/audit-read-model.repository.js';
import { redactReviewPointRowsForViewer } from './review-point-read-policy.js';
import { healUxDomainRowForFreeSnapshotPortal } from '../../lib/snapshot-audit-response-heal.js';
import { FREE_SNAPSHOT_UX_DOMAIN_KEY } from '../../routes/audits/config/audits-route-policy.js';
import { normalizeAuditStrategyRowForReadModel } from '../strategy/strategy-audit-read-normalize.js';
import { buildAuditReportCoverage } from './audits-report-coverage.service.js';

export function parseAuditsPagination(query: { limit?: string | number; offset?: string | number }) {
  const limit = Math.min(
    parseInt(String(query.limit ?? String(AUDITS_LIST_DEFAULT_LIMIT)), 10) || AUDITS_LIST_DEFAULT_LIMIT,
    AUDITS_LIST_MAX_LIMIT,
  );
  const offset = Math.max(parseInt(String(query.offset ?? '0'), 10) || 0, 0);
  return { limit, offset };
}

export async function getAuditList(userId: string, query: { limit?: string | number; offset?: string | number }) {
  const { limit, offset } = parseAuditsPagination(query);
  const { data, count, error } = await listAuditsByUser({ userId, limit, offset });
  if (error) throw error;
  return { data, total: count ?? 0, limit, offset };
}

export async function getAuditViewModel(id: string, userId: string, viewerRole: UserRole | undefined) {
  const { data: audit, error: auditErr } = await fetchAuditByIdForUser(id, userId);
  if (auditErr || !audit) return null;

  const [reconRes, domainsRes, strategyRes, reviewsRes, briefRes] = await fetchAuditRelatedReadModel(id);
  const recon = reconRes.status === 'fulfilled' ? (reconRes.value.data ?? null) : null;
  const domainsArr = domainsRes.status === 'fulfilled' ? (domainsRes.value.data ?? []) : [];
  const strategyRaw = strategyRes.status === 'fulfilled' ? (strategyRes.value.data ?? null) : null;
  const reviewsRaw = reviewsRes.status === 'fulfilled' ? (reviewsRes.value.data ?? []) : [];
  const reviews = redactReviewPointRowsForViewer(reviewsRaw as Array<Record<string, unknown>>, viewerRole);
  const brief = briefRes.status === 'fulfilled' ? (briefRes.value.data ?? null) : null;

  const domainsMap: Record<string, unknown> = {};
  for (const domainRow of domainsArr) {
    const existing = domainsMap[domainRow.domain_key] as { version?: number } | undefined;
    if (!existing || domainRow.version > (existing.version ?? 0)) {
      domainsMap[domainRow.domain_key] = domainRow;
    }
  }

  if (audit.product_mode === 'free_snapshot' && audit.status === 'completed') {
    const ux = domainsMap[FREE_SNAPSHOT_UX_DOMAIN_KEY];
    if (ux && typeof ux === 'object' && ux !== null && !Array.isArray(ux)) {
      domainsMap[FREE_SNAPSHOT_UX_DOMAIN_KEY] = await healUxDomainRowForFreeSnapshotPortal(
        ux as Record<string, unknown>,
        audit.company_url as string,
      );
    }
  }

  const briefResponses =
    brief && typeof brief === 'object' && brief !== null && 'responses' in brief
      ? (brief as { responses?: unknown }).responses
      : undefined;
  const strategy =
    strategyRaw && typeof strategyRaw === 'object'
      ? (normalizeAuditStrategyRowForReadModel({
          strategy: strategyRaw as Record<string, unknown>,
          domainRows: domainsArr as Array<{ domain_key: string; issues?: unknown }>,
          briefResponses:
            briefResponses && typeof briefResponses === 'object' && !Array.isArray(briefResponses)
              ? (briefResponses as Record<string, unknown>)
              : null,
        }) as typeof strategyRaw)
      : strategyRaw;

  const coverageDomains = Object.values(domainsMap)
    .filter(
      (row): row is { domain_key: string; status?: string | null } =>
        Boolean(
          row &&
            typeof row === 'object' &&
            'domain_key' in row &&
            typeof (row as { domain_key?: unknown }).domain_key === 'string',
        ),
    )
    .map((row) => ({
      domain_key: row.domain_key,
      status: row.status ?? null,
    }));

  return {
    meta: audit,
    report_coverage: buildAuditReportCoverage(audit, coverageDomains),
    recon,
    domains: domainsMap,
    strategy,
    reviews,
    brief,
  };
}
