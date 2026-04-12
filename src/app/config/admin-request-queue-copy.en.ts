/**
 * Admin request queue — labels, status chrome, and empty-state copy (static front config).
 */

import type { AuditRequestStatus } from '../data/auditTypes';

export const ADMIN_REQUEST_QUEUE_COPY = {
  pageTitle: 'Request queue',
  pageSubtitle: 'Incoming client audit requests (Admin)',
  navSnapshots: 'Snapshots',
  navDiscovery: 'Discovery',
  navPortfolio: 'Portfolio',
  filterAwaiting: 'Awaiting Review',
  filterAll: 'All requests',
  emptyAwaiting:
    'Nothing awaiting review — no audit requests or client pre-brief submissions.',
  emptyAll: 'No requests in this view',
  preBriefListUnavailablePrefix: 'Pre-brief list unavailable:',
  intakeSummaryLine: (n: number, total: number, auditId: string | null, expired: boolean) => {
    const parts = [`Pre-brief · ${n}/${total} fields answered`];
    if (auditId) parts.push('linked to audit');
    else parts.push('not linked');
    if (expired) parts.push('link expired');
    return parts.join(' · ');
  },
  awaitingSectionTitle: 'Awaiting Review',
  auditRequestsPaginationLabel: 'Audit requests pagination',
  paginationRange: (from: number, to: number, total: number) => `Showing ${from}–${to} of ${total}`,
  paginationPrev: 'Previous',
  paginationNext: 'Next',
} as const;

export const ADMIN_REQUEST_QUEUE_STATUS: Record<
  AuditRequestStatus,
  { label: string; color: string }
> = {
  draft: { label: 'Draft', color: 'rgba(255,255,255,0.30)' },
  submitted: { label: 'Submitted', color: 'var(--callout-warning-icon)' },
  under_review: { label: 'Under Review', color: '#3B82F6' },
  approved: { label: 'Approved', color: '#10B981' },
  rejected: { label: 'Rejected', color: '#EF4444' },
  running: { label: 'In Progress', color: '#1CBDFF' },
  delivered: { label: 'Delivered', color: '#10B981' },
};

export const ADMIN_REQUEST_QUEUE_CHROME = {
  errorPanelBackground: 'rgba(239,68,68,0.08)',
  errorPanelBorder: 'rgba(239,68,68,0.20)',
  errorText: '#EF4444',
  filterActiveBackground: 'rgba(28,189,255,0.15)',
  filterActiveBorder: 'rgba(28,189,255,0.35)',
  rejectNoteBackground: 'rgba(239,68,68,0.12)',
} as const;
