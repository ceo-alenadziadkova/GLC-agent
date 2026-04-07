import { Link } from 'react-router';
import { ClipboardText, PlusCircle, Spinner, Warning } from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { PortalAuditCard } from '../components/PortalAuditCard';
import { useAudits } from '../hooks/useAudits';

export function ClientPortal() {
  const { audits: myAudits, loading: auditsLoading, error: auditsError } = useAudits(30);

  const actions = (
    <Link
      to="/portal/audit/new"
      className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium no-underline transition-all"
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
      <div className="glc-page-content max-w-3xl mx-auto space-y-8 mobile:space-y-6">
        {auditsLoading && (
          <div className="flex items-center justify-center py-20">
            <Spinner className="w-6 h-6 animate-spin" style={{ color: 'var(--glc-blue)' }} />
          </div>
        )}

        {auditsError && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--callout-error-bg)', border: '1px solid var(--callout-error-border)', color: 'var(--score-1)' }}
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
              {myAudits.map(a => (
                <PortalAuditCard key={a.id} audit={a} />
              ))}
            </div>
          </section>
        )}

        {!auditsLoading && !auditsError && myAudits.length === 0 && (
          <div className="text-center py-16 mobile:py-12">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--callout-info-bg)', border: '1px solid var(--callout-info-border)' }}
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
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium no-underline glc-touch-target"
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
