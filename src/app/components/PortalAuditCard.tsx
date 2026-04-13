import type { ComponentProps } from 'react';
import { Link } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import { CaretRight } from '@phosphor-icons/react';
import { StatusPill } from './glc/StatusPill';
import type { AuditMeta } from '../data/auditTypes';
import { formatAuditWebsiteDisplay } from '../data/no-public-website';
import { auditPackageLabel, isSnapshotStyleAudit } from '../lib/audit-execution-plan';
import { PORTAL_AUDIT_CARD_COPY } from '../config/portal-audit-card-copy.en';

type PortalPillStatus = ComponentProps<typeof StatusPill>['status'];

function formatUpdatedRelative(iso: string | undefined): string {
  if (!iso) return '';
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

/** Client-facing status copy for the portal list (not raw DB strings). */
function clientPortalAuditPresentation(a: AuditMeta): {
  pill: PortalPillStatus;
  label: string;
  hint: string;
  pulse: boolean;
} {
  const C = PORTAL_AUDIT_CARD_COPY.statuses;
  switch (a.status) {
    case 'created':
      return {
        pill: 'pending',
        label: C.created.label,
        hint: C.created.hint,
        pulse: false,
      };
    case 'recon':
      return {
        pill: 'running',
        label: C.recon.label,
        hint: C.recon.hint,
        pulse: true,
      };
    case 'auto':
    case 'analytic':
      return {
        pill: 'running',
        label: C.auto.label,
        hint: C.auto.hint,
        pulse: true,
      };
    case 'review':
      return {
        pill: 'review',
        label: C.review.label,
        hint: C.review.hint,
        pulse: false,
      };
    case 'completed':
      if (isSnapshotStyleAudit(a)) {
        return {
          pill: 'completed',
          label: C.completedSnapshot.label,
          hint: C.completedSnapshot.hint,
          pulse: false,
        };
      }
      return {
        pill: 'completed',
        label: C.completed.label,
        hint: C.completed.hint,
        pulse: false,
      };
    case 'failed':
      return {
        pill: 'failed',
        label: C.failed.label,
        hint: C.failed.hint,
        pulse: false,
      };
    case 'cancelled':
      return {
        pill: 'cancelled',
        label: C.cancelled.label,
        hint: C.cancelled.hint,
        pulse: false,
      };
    default:
      return {
        pill: 'running',
        label: a.status.replace(/_/g, ' '),
        hint: C.defaultUnknownHint,
        pulse: false,
      };
  }
}

function portalCardWebsiteLine(a: AuditMeta, title: string): string | null {
  const site = formatAuditWebsiteDisplay(a.company_url, a.no_public_website);
  if (!site) return null;
  if (a.company_name?.trim() && site !== title) return site;
  return null;
}

interface PortalAuditCardProps {
  audit: AuditMeta;
}

/**
 * Single audit row/card for the client portal list. Shared layout for consistent mobile and desktop density.
 */
export function PortalAuditCard({ audit: a }: PortalAuditCardProps) {
  const title =
    a.company_name?.trim() || formatAuditWebsiteDisplay(a.company_url, a.no_public_website) || PORTAL_AUDIT_CARD_COPY.fallbackTitle;
  const websiteLine = portalCardWebsiteLine(a, title);
  const pres = clientPortalAuditPresentation(a);
  const modeLabel = auditPackageLabel(a, { style: 'audit' });
  const updatedRel = formatUpdatedRelative(a.updated_at);
  const metaParts = [
    a.industry?.trim(),
    modeLabel,
    updatedRel ? `${PORTAL_AUDIT_CARD_COPY.updatedPrefix} ${updatedRel}` : null,
  ].filter(Boolean) as string[];

  return (
    <Link
      to={`/portal/audit/${a.id}`}
      className="block no-underline rounded-xl px-4 py-3.5 transition-all active:opacity-90 mobile:py-3"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div
            className="font-semibold truncate"
            style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}
          >
            {title}
          </div>
          {websiteLine ? (
            <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
              {websiteLine}
            </div>
          ) : null}
          <p className="text-xs m-0 leading-relaxed mobile:line-clamp-3" style={{ color: 'var(--text-quaternary)' }}>
            {pres.hint}
          </p>
          {metaParts.length > 0 ? (
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {metaParts.join(' · ')}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0 pt-0.5">
          <StatusPill status={pres.pill} label={pres.label} pulse={pres.pulse} />
          <CaretRight className="w-4 h-4" style={{ color: 'var(--text-quaternary)' }} aria-hidden />
        </div>
      </div>
    </Link>
  );
}
