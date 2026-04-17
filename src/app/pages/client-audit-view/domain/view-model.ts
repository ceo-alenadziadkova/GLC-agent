import type { AuditMeta, AuditState } from '../../../data/auditTypes';
import { CLIENT_AUDIT_VIEW_COPY } from '../../../config/client-audit-view-copy';
import { auditSkipsPublicWebsiteFetches, formatAuditWebsiteDisplay } from '../../../data/no-public-website';

type SnapshotAccessState = {
  showCallout: boolean;
  robotsLimitedSample: boolean;
} | null;

export function deriveDomainDisplay(auditState: AuditState | null): string {
  if (!auditState) return '';
  if (auditSkipsPublicWebsiteFetches(auditState.meta.no_public_website, auditState.meta.company_url)) {
    return formatAuditWebsiteDisplay(auditState.meta.company_url, auditState.meta.no_public_website);
  }

  try {
    return new URL(auditState.meta.company_url).hostname;
  } catch {
    return auditState.meta.company_url;
  }
}

export function deriveStatusLabel(meta: AuditMeta | null | undefined): string {
  return meta?.status?.replace(/_/g, ' ') ?? '';
}

export function derivePortalSubtitle(
  meta: AuditMeta | null | undefined,
  isFreeSnapshot: boolean,
  freeSnapshotAccess: SnapshotAccessState,
): string {
  if (isFreeSnapshot && meta?.status === 'completed') {
    if (freeSnapshotAccess?.showCallout) {
      return freeSnapshotAccess.robotsLimitedSample
        ? CLIENT_AUDIT_VIEW_COPY.snapshot.subtitleLimitedSample
        : CLIENT_AUDIT_VIEW_COPY.snapshot.subtitleLimitedFetch;
    }
    return CLIENT_AUDIT_VIEW_COPY.snapshot.subtitleSaved;
  }
  return CLIENT_AUDIT_VIEW_COPY.snapshot.subtitleDefault;
}
