import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Check, ClipboardText, Equals, PlusCircle, Spinner, Warning, X } from '@phosphor-icons/react';
import { ensureHttpsUrl } from '@glc/intake-core';
import { AppShell } from '../components/AppShell';
import { PortalAuditCard } from '../components/PortalAuditCard';
import { useAudits } from '../hooks/useAudits';
import { api } from '../data/apiService';
import { competitorComparisonCaption } from '../lib/snapshot-landing-helpers';
import { PORTAL_COMPETITOR_COMPARE_COPY } from '../config/portal-competitor-compare-copy.en';

export function ClientPortal() {
  const { audits: myAudits, loading: auditsLoading, error: auditsError } = useAudits(30);
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState('');
  const [comparison, setComparison] = useState<Awaited<ReturnType<typeof api.compareSnapshotSites>>['competitor_mini']>(null);

  const selfSiteUrl = useMemo(
    () =>
      myAudits.find(a => !a.no_public_website && typeof a.company_url === 'string' && a.company_url.trim().length > 0)
        ?.company_url ?? '',
    [myAudits],
  );

  async function handleCompareSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selfSiteUrl || !competitorUrl.trim() || compareLoading) return;
    setCompareLoading(true);
    setCompareError('');
    setComparison(null);
    try {
      const payload = await api.compareSnapshotSites(selfSiteUrl, competitorUrl.trim());
      if (!payload.competitor_mini || payload.competitor_mini.comparisons.length === 0) {
        setCompareError(PORTAL_COMPETITOR_COMPARE_COPY.missingComparison);
        return;
      }
      setComparison(payload.competitor_mini);
    } catch (error) {
      const message = error instanceof Error ? error.message : PORTAL_COMPETITOR_COMPARE_COPY.missingComparison;
      setCompareError(message);
    } finally {
      setCompareLoading(false);
    }
  }

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

        {!auditsLoading && !auditsError && (
          <section
            className="glc-card p-4 sm:p-5"
            style={{ borderRadius: 'var(--radius-xl)' }}
          >
            <h3
              className="font-semibold mb-2"
              style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}
            >
              {PORTAL_COMPETITOR_COMPARE_COPY.sectionTitle}
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
              {PORTAL_COMPETITOR_COMPARE_COPY.sectionBody}
            </p>

            {!selfSiteUrl ? (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {PORTAL_COMPETITOR_COMPARE_COPY.noComparableSite}
              </p>
            ) : (
              <>
                <form className="space-y-3" onSubmit={handleCompareSubmit}>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-quaternary)' }}>
                      {PORTAL_COMPETITOR_COMPARE_COPY.selfWebsiteLabel}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {new URL(ensureHttpsUrl(selfSiteUrl)).hostname}
                    </p>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-quaternary)' }}>
                      {PORTAL_COMPETITOR_COMPARE_COPY.competitorWebsiteLabel}
                    </span>
                    <input
                      type="text"
                      value={competitorUrl}
                      onChange={event => setCompetitorUrl(event.target.value)}
                      placeholder={PORTAL_COMPETITOR_COMPARE_COPY.competitorWebsitePlaceholder}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{
                        borderColor: 'var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={compareLoading || competitorUrl.trim().length === 0}
                    className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium mobile:min-h-11"
                    style={{
                      background: 'var(--gradient-brand)',
                      color: 'var(--glc-ink)',
                      opacity: compareLoading || competitorUrl.trim().length === 0 ? 0.6 : 1,
                    }}
                  >
                    {compareLoading
                      ? PORTAL_COMPETITOR_COMPARE_COPY.loadingAction
                      : PORTAL_COMPETITOR_COMPARE_COPY.compareAction}
                  </button>
                </form>

                {compareError && (
                  <p className="mt-3 text-sm" style={{ color: 'var(--score-1)' }}>
                    {compareError}
                  </p>
                )}

                {comparison && (
                  <div className="mt-4 rounded-lg border p-4" style={{ borderColor: 'var(--border-subtle)' }}>
                    <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                      {PORTAL_COMPETITOR_COMPARE_COPY.comparedToPrefix} {comparison.competitor_name}
                    </p>
                    <ul className="space-y-2">
                      {comparison.comparisons.map((row, index) => {
                        const { kind, text } = competitorComparisonCaption(row, comparison.competitor_name);
                        const Icon = kind === 'tie' ? Equals : kind === 'client' ? Check : X;
                        const color = kind === 'tie' ? 'var(--text-tertiary)' : kind === 'client' ? 'var(--glc-green)' : 'var(--score-1)';
                        return (
                          <li key={`${row.metric}-${index}`} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} weight="bold" />
                            <span>{text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </>
            )}
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
