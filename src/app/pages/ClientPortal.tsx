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
import { cn } from '../components/ui/utils';
import { Input } from '../components/ui/input';

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
      className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-400 to-sky-600 px-4 py-2 text-sm font-medium text-slate-950 no-underline shadow-[var(--glow-blue-sm)] transition-all"
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
            <Spinner className="text-info h-6 w-6 animate-spin" />
          </div>
        )}

        {auditsError && (
          <div className="bg-destructive/10 text-destructive border-destructive/40 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm">
            <Warning className="w-4 h-4 flex-shrink-0" />
            {auditsError}
          </div>
        )}

        {!auditsLoading && !auditsError && myAudits.length > 0 && (
          <section>
            <h3 className="text-foreground mb-3 text-sm font-semibold">
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
            className="glc-card rounded-xl p-4 sm:p-5"
          >
            <h3 className="text-foreground mb-2 text-sm font-semibold">
              {PORTAL_COMPETITOR_COMPARE_COPY.sectionTitle}
            </h3>
            <p className="text-muted-foreground mb-4 text-sm">
              {PORTAL_COMPETITOR_COMPARE_COPY.sectionBody}
            </p>

            {!selfSiteUrl ? (
              <p className="text-muted-foreground text-sm">
                {PORTAL_COMPETITOR_COMPARE_COPY.noComparableSite}
              </p>
            ) : (
              <>
                <form className="space-y-3" onSubmit={handleCompareSubmit}>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
                      {PORTAL_COMPETITOR_COMPARE_COPY.selfWebsiteLabel}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {new URL(ensureHttpsUrl(selfSiteUrl)).hostname}
                    </p>
                  </div>
                  <label className="block">
                    <span className="text-muted-foreground mb-1 block text-xs font-semibold uppercase tracking-wide">
                      {PORTAL_COMPETITOR_COMPARE_COPY.competitorWebsiteLabel}
                    </span>
                    <Input
                      type="text"
                      value={competitorUrl}
                      onChange={event => setCompetitorUrl(event.target.value)}
                      placeholder={PORTAL_COMPETITOR_COMPARE_COPY.competitorWebsitePlaceholder}
                      className="h-auto w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={compareLoading || competitorUrl.trim().length === 0}
                    className={cn(
                      'inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-sky-400 to-sky-600 px-4 py-2 text-sm font-medium text-slate-950 mobile:min-h-11',
                      compareLoading || competitorUrl.trim().length === 0 ? 'opacity-60' : '',
                    )}
                  >
                    {compareLoading
                      ? PORTAL_COMPETITOR_COMPARE_COPY.loadingAction
                      : PORTAL_COMPETITOR_COMPARE_COPY.compareAction}
                  </button>
                </form>

                {compareError && (
                  <p className="text-destructive mt-3 text-sm">
                    {compareError}
                  </p>
                )}

                {comparison && (
                  <div className="mt-4 rounded-lg border p-4">
                    <p className="text-foreground mb-3 text-sm font-semibold">
                      {PORTAL_COMPETITOR_COMPARE_COPY.comparedToPrefix} {comparison.competitor_name}
                    </p>
                    <ul className="space-y-2">
                      {comparison.comparisons.map((row, index) => {
                        const { kind, text } = competitorComparisonCaption(row, comparison.competitor_name);
                        const Icon = kind === 'tie' ? Equals : kind === 'client' ? Check : X;
                        const colorClass = kind === 'tie' ? 'text-muted-foreground' : kind === 'client' ? 'text-success' : 'text-destructive';
                        return (
                          <li key={`${row.metric}-${index}`} className="text-muted-foreground flex items-start gap-2 text-sm">
                            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', colorClass)} weight="bold" />
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
            <div className="bg-info/10 border-info/40 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border">
              <ClipboardText className="text-info h-7 w-7" />
            </div>
            <h3 className="text-foreground mb-2 text-base font-semibold">
              No audits yet
            </h3>
            <p className="text-muted-foreground mb-5 text-sm">
              Create an audit, complete the branching intake brief, then start the run when you are ready.
            </p>
            <Link
              to="/portal/audit/new"
              className="glc-touch-target inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-400 to-sky-600 px-5 py-2.5 text-sm font-medium text-slate-950 no-underline"
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
