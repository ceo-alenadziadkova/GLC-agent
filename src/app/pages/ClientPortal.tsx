import type { ComponentProps } from 'react';
import { Link } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import { CaretRight, ClipboardText, PlusCircle, Spinner, Warning } from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { StatusPill } from '../components/glc/StatusPill';
import { useAudits } from '../hooks/useAudits';
import type { AuditMeta } from '../data/auditTypes';
import { formatAuditWebsiteDisplay } from '../data/no-public-website';

type PortalPillStatus = ComponentProps<typeof StatusPill>['status'];

function productModeShortLabel(mode: AuditMeta['product_mode'] | undefined): string | null {
  if (mode === 'express') return 'Express audit';
  if (mode === 'full') return 'Full audit';
  if (mode === 'free_snapshot') return 'Free snapshot';
  return null;
}

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
  switch (a.status) {
    case 'created':
      return {
        pill: 'pending',
        label: 'Brief & setup',
        hint: 'Complete the intake brief on the next screen, then start your audit when you are ready.',
        pulse: false,
      };
    case 'recon':
      return {
        pill: 'running',
        label: 'Scanning your site',
        hint: 'We are collecting public information about your website.',
        pulse: true,
      };
    case 'auto':
    case 'analytic':
      return {
        pill: 'running',
        label: 'Analysis running',
        hint: 'Automated phases are in progress. Open the audit to follow the pipeline.',
        pulse: true,
      };
    case 'review':
      return {
        pill: 'review',
        label: 'Review pause',
        hint: 'Waiting on your GLC consultant at a review step before the run continues.',
        pulse: false,
      };
    case 'completed':
      return {
        pill: 'completed',
        label: 'Completed',
        hint: 'Your report and deliverables are ready to view.',
        pulse: false,
      };
    case 'failed':
      return {
        pill: 'failed',
        label: 'Needs attention',
        hint: 'The run stopped unexpectedly. Your GLC contact can help.',
        pulse: false,
      };
    default:
      return {
        pill: 'running',
        label: a.status.replace(/_/g, ' '),
        hint: 'Open this audit for details.',
        pulse: false,
      };
  }
}

function portalCardWebsiteLine(a: AuditMeta, title: string): string | null {
  const site = formatAuditWebsiteDisplay(a.company_url);
  if (!site) return null;
  if (a.company_name?.trim() && site !== title) return site;
  return null;
}

export function ClientPortal() {
  const { audits: myAudits, loading: auditsLoading, error: auditsError } = useAudits(30);

  const actions = (
    <Link
      to="/portal/audit/new"
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium no-underline transition-all"
      style={{
        background: 'var(--gradient-brand)',
        color: 'var(--glc-ink)',
        boxShadow: 'var(--glow-blue-sm)',
      }}
    >
      <PlusCircle className="w-4 h-4" />
      New audit
    </Link>
  );

  return (
    <AppShell title="My Portal" subtitle="Your audits and intake briefs" actions={actions}>
      <div className="px-7 py-6 max-w-3xl mx-auto space-y-10">
        {auditsLoading && (
          <div className="flex items-center justify-center py-20">
            <Spinner className="w-6 h-6 animate-spin" style={{ color: 'var(--glc-blue)' }} />
          </div>
        )}

        {auditsError && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
            style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#EF4444' }}
          >
            <Warning className="w-4 h-4 flex-shrink-0" />
            {auditsError}
          </div>
        )}

        {!auditsLoading && !auditsError && myAudits.length > 0 && (
          <section>
            <h3
              className="font-semibold mb-3"
              style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}
            >
              My audits
            </h3>
            <div className="space-y-2">
              {myAudits.map(a => {
                const title = a.company_name?.trim() || formatAuditWebsiteDisplay(a.company_url) || 'Your audit';
                const websiteLine = portalCardWebsiteLine(a, title);
                const pres = clientPortalAuditPresentation(a);
                const modeLabel = productModeShortLabel(a.product_mode);
                const updatedRel = formatUpdatedRelative(a.updated_at);
                const metaParts = [a.industry?.trim(), modeLabel, updatedRel ? `Updated ${updatedRel}` : null].filter(
                  Boolean,
                ) as string[];

                return (
                  <Link
                    key={a.id}
                    to={`/portal/audit/${a.id}`}
                    className="block no-underline rounded-xl px-4 py-3.5 transition-all hover:brightness-[1.02]"
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
                        <p className="text-xs m-0 leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
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
              })}
            </div>
          </section>
        )}

        {!auditsLoading && !auditsError && myAudits.length === 0 && (
          <div className="text-center py-20">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'rgba(28,189,255,0.08)', border: '1px solid rgba(28,189,255,0.15)' }}
            >
              <ClipboardText className="w-7 h-7" style={{ color: 'var(--glc-blue)' }} />
            </div>
            <h3
              className="font-semibold mb-2"
              style={{ color: 'var(--text-primary)', fontSize: 'var(--text-base)' }}
            >
              No audits yet
            </h3>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', marginBottom: 20 }}>
              Create an audit, complete the branching intake brief, then start the run when you are ready.
            </p>
            <Link
              to="/portal/audit/new"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium no-underline"
              style={{ background: 'var(--gradient-brand)', color: 'var(--glc-ink)' }}
            >
              <PlusCircle className="w-4 h-4" />
              New audit
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
