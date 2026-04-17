/**
 * Admin request queue — labels, status chrome, and empty-state copy (static front config).
 */

import type { AuditRequestStatus, ProductMode } from '../data/auditTypes';

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
  /** Product mode labels for audit request rows. */
  productModeLabel: {
    free_snapshot: 'Free snapshot',
    express: 'Pro',
    full: 'Complete',
  } satisfies Record<ProductMode, string>,
  rowKindAuditRequest: 'Audit request',
  rowKindClientPreBrief: 'Client pre-brief',
  noPublicWebsite: 'No public website',
  clientIdPrefix: 'client',
  sectorPrefix: 'Sector:',
  openAudit: 'Open audit',
  approveAndCreateAudit: 'Approve & create audit',
  rejectReasonPlaceholder: 'Reason for rejection (optional)',
  confirmReject: 'Confirm reject',
  cancel: 'Cancel',
  reject: 'Reject',
  linkExpired: 'Link expired',
  linkedAudit: 'Linked audit',
  notLinkedToAudit: 'Not linked to an audit yet',
  copyClientLink: 'Copy client link',
  copied: 'Copied',
  newAuditWithPrefill: 'New Audit with this prefill',
  answersSectionTitle: 'Answers',
  rawResponsesJsonSummary: 'Raw responses (JSON)',
  awaitingSummaryLine: (tot: number, reqCount: number, intakeCount: number) =>
    `${tot} total — ${reqCount} audit request(s), ${intakeCount} client pre-brief(s). Sorted newest first.`,
  intakeTitleFallback: 'Client pre-brief',
} as const;

export const ADMIN_REQUEST_QUEUE_STATUS: Record<
  AuditRequestStatus,
  { label: string; color: string }
> = {
  draft: { label: 'Draft', color: 'var(--overlay-white-30)' },
  submitted: { label: 'Submitted', color: 'var(--callout-warning-icon)' },
  under_review: { label: 'Under Review', color: 'var(--glc-blue)' },
  approved: { label: 'Approved', color: 'var(--glc-green)' },
  rejected: { label: 'Rejected', color: 'var(--score-1)' },
  running: { label: 'In Progress', color: 'var(--glc-blue)' },
  delivered: { label: 'Delivered', color: 'var(--glc-green)' },
};

export const ADMIN_REQUEST_QUEUE_CHROME = {
  errorPanelBackground: 'var(--ui-danger-muted-bg)',
  errorPanelBorder: 'var(--ui-danger-border-20)',
  errorText: 'var(--score-1)',
  filterActiveBackground: 'var(--glc-blue-muted-strong)',
  filterActiveBorder: 'var(--callout-info-border-strong)',
  rejectNoteBackground: 'var(--ui-danger-muted-bg-12)',
  /** Clipboard / audit-request row icon tile */
  rowIconBackground: 'var(--callout-info-bg)',
  rowIconBorder: 'var(--glc-blue-muted-strong)',
  /** Outline for “New audit with prefill” CTA */
  prefillCtaBorder: 'var(--callout-info-border-strong)',
} as const;
