import { ADMIN_REQUEST_QUEUE_DISPLAY } from '../../../config/admin-request-queue-config';
import { ADMIN_REQUEST_QUEUE_COPY } from '../../../config/admin-request-queue-copy.en';
import type { AuditRequest, AuditRequestStatus } from '../../../data/auditTypes';
import type { BriefResponseEntry, BriefResponses } from '../../../data/briefQuestions';
import { isNoPublicWebsiteUrl } from '../../../data/no-public-website';

/** Intake list row shape from `api.listIntakeSubmissions` (consultant). */
export type IntakeSubmissionQueueRow = {
  token: string;
  metadata: Record<string, unknown>;
  responses: Record<string, unknown>;
  submitted_at: string;
  expires_at: string;
  audit_id: string | null;
  intake_url: string;
};

export type AdminQueueRow =
  | { kind: 'request'; req: AuditRequest; at: number }
  | { kind: 'intake'; s: IntakeSubmissionQueueRow; at: number };

export function normalizeIntakeResponses(raw: Record<string, unknown>): BriefResponses {
  const out: BriefResponses = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v != null && typeof v === 'object' && !Array.isArray(v) && 'value' in (v as Record<string, unknown>)) {
      out[k] = { value: (v as BriefResponseEntry).value, source: (v as BriefResponseEntry).source };
    } else {
      out[k] = { value: v as BriefResponseEntry['value'], source: 'client' };
    }
  }
  return out;
}

/**
 * UX gate for showing approve/reject on the admin queue.
 * Server must still enforce transitions (`isApprovableAuditRequestStatus` in
 * `server/src/audit-requests/domain/audit-request-status-policy.ts`).
 */
export function auditRequestAwaitingAdminAction(status: AuditRequestStatus): boolean {
  return status === 'submitted' || status === 'under_review';
}

export function auditRequestRowDomainLabel(url: string): string {
  if (isNoPublicWebsiteUrl(url)) return ADMIN_REQUEST_QUEUE_COPY.noPublicWebsite;
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function auditRequestIndustryOtherSpec(briefSnapshot: Record<string, unknown> | undefined): string {
  const v = briefSnapshot?.intake_industry_specify;
  return typeof v === 'string' ? v.trim() : '';
}

export function formatAuditRequestCreatedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(ADMIN_REQUEST_QUEUE_DISPLAY.dateLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function previewClientIdSegment(clientId: string | null | undefined): string {
  const len = ADMIN_REQUEST_QUEUE_DISPLAY.clientIdPreviewLength;
  return clientId?.slice(0, len) ?? '—';
}

export function industryIsOtherLabel(industry: string | null | undefined): boolean {
  return industry === ADMIN_REQUEST_QUEUE_DISPLAY.industryOtherLabel;
}

export function buildAwaitingRows(
  pendingRequests: AuditRequest[],
  intakeSubmissions: IntakeSubmissionQueueRow[],
): AdminQueueRow[] {
  return [
    ...pendingRequests.map(req => ({
      kind: 'request' as const,
      req,
      at: new Date(req.created_at).getTime(),
    })),
    ...intakeSubmissions.map(s => ({
      kind: 'intake' as const,
      s,
      at: new Date(s.submitted_at).getTime(),
    })),
  ].sort((a, b) => b.at - a.at);
}

export function auditRequestPaginationMeta(params: {
  filter: 'all' | 'pending';
  total: number;
  limit: number;
  pageOffset: number;
  currentPageRowsCount: number;
}): { showPagination: boolean; rangeFrom: number; rangeTo: number } {
  const showPagination = params.filter === 'all' && params.total > params.limit;
  const rangeFrom = params.total === 0 ? 0 : params.pageOffset + 1;
  const rangeTo = Math.min(params.pageOffset + params.currentPageRowsCount, params.total);
  return { showPagination, rangeFrom, rangeTo };
}
