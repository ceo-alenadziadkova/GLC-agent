import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';
import {
  Plus, MagnifyingGlass, ArrowUpRight,
  Buildings, Calendar, ArrowsClockwise, Trash
} from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { ScoreBadge } from '../components/glc/ScoreBadge';
import { StatusPill } from '../components/glc/StatusPill';
import { SectionLabel } from '../components/glc/SectionLabel';
import { KpiStrip } from '../components/glc/KpiStrip';
import { ActionPanel } from '../components/glc/ActionPanel';
import { ActivityFeed } from '../components/glc/ActivityFeed';
import { ScoreDistributionChart } from '../components/glc/ScoreDistributionChart';
import { useAudits } from '../hooks/useAudits';
import { useDashboard } from '../hooks/useDashboard';
import type { AuditMeta } from '../data/auditTypes';
import { formatAuditWebsiteDisplay } from '../data/no-public-website';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Input } from '../components/ui/input';
import { Callout } from '../components/ui/callout';
import { Button } from '../components/ui/button';
import { getAuditListPillPresentation } from '../lib/pipeline-monitor-helpers';
import { WORKSPACE_PAGE_COPY } from '../config/workspace-page-copy';
import { formatAppShortDate } from '../lib/date-format';

function formatDashboardDate(isoDate: string): string {
  return formatAppShortDate(isoDate);
}

function formatAuditAriaLabel(template: string, company: string): string {
  return template.replace('{{company}}', company);
}

function DashboardAuditMobileCard({
  c,
  onRequestDelete,
  copy,
}: {
  c: AuditMeta;
  onRequestDelete: (id: string, label: string) => void;
  copy: typeof WORKSPACE_PAGE_COPY.dashboard.auditsList;
}) {
  const statusPill = getAuditListPillPresentation(c.status);
  return (
    <div
      className="glc-card rounded-xl p-4"
    >
      <div className="flex items-start gap-3 min-w-0">
        <div
          className="text-info border-info/30 bg-info/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold"
        >
          {(c.company_name || formatAuditWebsiteDisplay(c.company_url, c.no_public_website)).slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            to={`/audit/${c.id}`}
            className="text-foreground block truncate font-semibold no-underline"
          >
            {c.company_name || formatAuditWebsiteDisplay(c.company_url, c.no_public_website)}
          </Link>
          <div className="text-muted-foreground mt-0.5 truncate text-xs">
            {formatAuditWebsiteDisplay(c.company_url, c.no_public_website)}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
            <span className="text-muted-foreground text-xs">{c.industry || '—'}</span>
            <span className="text-muted-foreground text-xs" aria-hidden>
              ·
            </span>
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              {formatDashboardDate(c.created_at)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {c.overall_score !== null ? (
              <ScoreBadge score={Math.round(c.overall_score)} size="sm" />
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
            <StatusPill status={statusPill.status} pulse={statusPill.pulse} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2 border-t pt-3">
        <Button asChild variant="outline" size="sm" className="glc-touch-target no-underline">
          <Link to={c.status === 'created' ? `/pipeline/${c.id}` : `/audit/${c.id}`}>
            <ArrowUpRight className="w-4 h-4" />
            {copy.openButton}
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive glc-touch-target"
          onClick={() => {
            onRequestDelete(
              c.id,
              c.company_name || formatAuditWebsiteDisplay(c.company_url, c.no_public_website),
            );
          }}
        >
          <Trash className="w-4 h-4" />
          {copy.deleteButton}
        </Button>
      </div>
    </div>
  );
}

export function Dashboard() {
  // Analytics panels — independent fetch from the audit list
  const { data: dashData, loading: dashLoading, error: dashError, reloadDashboard } = useDashboard();
  // Audit list — existing paginated fetch
  const {
    audits,
    loading: auditsLoading,
    error: auditsError,
    deleteAudit,
    hasMore,
    loadMore,
    total,
  } = useAudits();
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  const filtered = audits.filter(c =>
    query === '' ||
    (c.company_name || '').toLowerCase().includes(query.toLowerCase()) ||
    (c.industry || '').toLowerCase().includes(query.toLowerCase()) ||
    c.company_url.toLowerCase().includes(query.toLowerCase()) ||
    formatAuditWebsiteDisplay(c.company_url, c.no_public_website).toLowerCase().includes(query.toLowerCase())
  );
  const dashboardAuditsListCopy = WORKSPACE_PAGE_COPY.dashboard.auditsList;
  const dashboardCopy = WORKSPACE_PAGE_COPY.dashboard;

  return (
    <AppShell
      title={dashboardCopy.appShellTitle}
      subtitle={dashboardCopy.appShellSubtitle}
      actions={
        <Button asChild variant="default" className="hidden sm:inline-flex">
          <Link to="/audit/new">
            <Plus className="w-4 h-4" /> {dashboardCopy.newAuditButton}
          </Link>
        </Button>
      }
    >
      <div className="glc-page-content space-y-8 mobile:space-y-6">

        {/* ── 1. KPI strip ──────────────────────────────────────── */}
        <div className="glc-page-hero glc-orb-decor p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="glc-kicker">{dashboardCopy.heroKicker}</p>
              <h2 className="glc-hero-title mt-2">{dashboardCopy.heroTitle}</h2>
              <p className="glc-hero-sub">
                {dashboardCopy.heroSubtitle}
              </p>
            </div>
            <div className="sm:hidden">
              <Button asChild variant="default" className="w-full justify-center no-underline">
                <Link to="/audit/new">
                  <Plus className="w-4 h-4" /> {dashboardCopy.newAuditButton}
                </Link>
              </Button>
            </div>
          </div>
          <KpiStrip kpis={dashData?.kpis} loading={dashLoading} />
        </div>

        {/* ── Analytics error banner (non-fatal) ────────────────── */}
        {dashError && !dashLoading && (
          <Callout intent="danger" className="text-destructive flex items-center gap-2 rounded-md px-4 py-2.5 text-xs">
            <ArrowsClockwise className="w-3.5 h-3.5 flex-shrink-0" />
            {dashboardCopy.analyticsUnavailable}
          </Callout>
        )}

        {/* ── 2. Action Required (2/3) + Score Distribution (1/3) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 min-w-0">
            <ActionPanel
              items={dashData?.action_items}
              loading={dashLoading}
              onRefresh={reloadDashboard}
            />
          </div>
          <div className="min-w-0">
            <ScoreDistributionChart
              distribution={dashData?.score_distribution}
              loading={dashLoading}
            />
          </div>
        </div>

        {/* ── 3. Activity Feed ──────────────────────────────────── */}
        <ActivityFeed
          events={dashData?.activity_feed}
          loading={dashLoading}
        />

        {/* ── 4. All Audits ─────────────────────────────────────── */}
        <section className="glc-soft-panel p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <SectionLabel>{dashboardAuditsListCopy.sectionLabel}</SectionLabel>
            <div className="bg-card flex w-full items-center gap-2 rounded-md border px-3 py-2 sm:w-auto ds-dashboard-search-minw">
              <MagnifyingGlass className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0" />
              <Input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={dashboardAuditsListCopy.searchPlaceholder}
                className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
              />
            </div>
          </div>

          {auditsLoading && audits.length === 0 && (
            <div className="flex items-center justify-center py-10">
              <ArrowsClockwise className="text-info h-5 w-5 animate-spin" />
            </div>
          )}

          {auditsError && (
            <div className="text-center py-4">
              <p className="text-destructive text-sm">{auditsError}</p>
            </div>
          )}

          {filtered.length > 0 && (
            <>
            <div className="glc-card hidden overflow-hidden rounded-xl sm:block">
              {/* Header */}
              <div className="text-muted-foreground bg-background grid border-b px-5 py-3 text-[length:var(--text-2xs)] font-bold uppercase ds-data-table-header-caps [grid-template-columns:2fr_1fr_1fr_88px_128px_40px]">
                <span>{dashboardAuditsListCopy.headerCompany}</span>
                <span>{dashboardAuditsListCopy.headerIndustry}</span>
                <span>{dashboardAuditsListCopy.headerCreated}</span>
                <span>{dashboardAuditsListCopy.headerScore}</span>
                <span>{dashboardAuditsListCopy.headerStatus}</span>
                <span />
              </div>

              <AnimatePresence initial={false}>
                {filtered.map((c: AuditMeta, i: number) => {
                  const companyLabel = c.company_name || formatAuditWebsiteDisplay(c.company_url, c.no_public_website);
                  const statusPill = getAuditListPillPresentation(c.status);
                  return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ delay: i * 0.025, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className={`group grid cursor-pointer items-center px-5 py-3.5 transition-colors [grid-template-columns:2fr_1fr_1fr_88px_128px_40px] ${
                      i < filtered.length - 1 ? 'border-b' : ''
                    } hover:bg-background`}
                  >
                    {/* Company */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="text-info border-info/30 bg-info/10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                      >
                        {companyLabel.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/audit/${c.id}`}
                          className="text-foreground block truncate text-sm font-semibold no-underline"
                        >
                          {companyLabel}
                        </Link>
                        <div className="text-muted-foreground mt-0.5 truncate text-xs">
                          {formatAuditWebsiteDisplay(c.company_url, c.no_public_website)}
                        </div>
                      </div>
                    </div>

                    <span className="text-muted-foreground text-sm">{c.industry || '—'}</span>

                    <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                      <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                      {formatDashboardDate(c.created_at)}
                    </div>

                    {c.overall_score !== null
                      ? <ScoreBadge score={Math.round(c.overall_score)} size="sm" />
                      : <span className="text-muted-foreground text-sm">—</span>
                    }

                    <StatusPill status={statusPill.status} pulse={statusPill.pulse} />

                    <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                      <Link
                        to={c.status === 'created' ? `/pipeline/${c.id}` : `/audit/${c.id}`}
                        className="glc-btn-icon h-7 w-7 rounded-md"
                        aria-label={formatAuditAriaLabel(dashboardAuditsListCopy.openIconAriaLabel, companyLabel)}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        type="button"
                        className="text-destructive glc-btn-icon h-7 w-7 rounded-md"
                        onClick={() => {
                          setDeleteTarget({
                            id: c.id,
                            label: companyLabel,
                          });
                        }}
                        title={dashboardAuditsListCopy.deleteTitle}
                        aria-label={formatAuditAriaLabel(dashboardAuditsListCopy.deleteIconAriaLabel, companyLabel)}
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            <div className="sm:hidden space-y-3">
              {filtered.map((c: AuditMeta) => (
                <DashboardAuditMobileCard
                  key={c.id}
                  c={c}
                  copy={dashboardAuditsListCopy}
                  onRequestDelete={(id, label) => setDeleteTarget({ id, label })}
                />
              ))}
            </div>
            </>
          )}

          {query && filtered.length === 0 && audits.length > 0 && !auditsLoading && !auditsError && (
            <div className="text-muted-foreground py-10 text-center text-sm">
              {dashboardAuditsListCopy.searchNoMatchesPrefix}
              {query}
              {dashboardAuditsListCopy.searchNoMatchesSuffix}
            </div>
          )}

          {!auditsLoading && audits.length === 0 && !auditsError && (
            <div className="text-muted-foreground py-14 text-center">
              <Buildings className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
              <p className="text-sm font-medium">{dashboardAuditsListCopy.emptyTitle}</p>
              <p className="text-xs mt-1">{dashboardAuditsListCopy.emptySubtitle}</p>
            </div>
          )}

          {!auditsError && !query && total > audits.length && (
            <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="text-muted-foreground text-xs">
                {dashboardAuditsListCopy.showingOfTotal
                  .replace('{{shown}}', String(audits.length))
                  .replace('{{total}}', String(total))}
              </p>
              {hasMore && (
                <Button type="button" variant="outline" size="sm" onClick={loadMore}>
                  {dashboardAuditsListCopy.loadMoreButton}
                </Button>
              )}
            </div>
          )}
        </section>

        {/* ── Add new client CTA ─────────────────────────────────── */}
        <motion.div
          whileHover={{ y: -1 }}
          transition={{ duration: 0.18 }}
          className="bg-card flex flex-col gap-4 rounded-xl border border-dashed p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="text-info border-info/30 bg-info/10 flex h-10 w-10 items-center justify-center rounded-xl border"
            >
              <Buildings className="w-5 h-5" />
            </div>
            <div>
              <p
                className="text-foreground text-sm font-semibold"
              >
                {dashboardCopy.cta.title}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {dashboardCopy.cta.subtitle}
              </p>
            </div>
          </div>
          <Button asChild variant="default" className="glc-touch-target w-full justify-center sm:w-auto">
            <Link to="/audit/new">
              <Plus className="w-4 h-4" /> {dashboardCopy.cta.button}
            </Link>
          </Button>
        </motion.div>

        <AlertDialog
          open={deleteTarget !== null}
          onOpenChange={open => {
            if (!open) setDeleteTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{dashboardAuditsListCopy.deleteTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget
                  ? `${dashboardAuditsListCopy.deleteDialogPrefix}${deleteTarget.label}${dashboardAuditsListCopy.deleteDialogSuffix}`
                  : ''}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">{dashboardAuditsListCopy.deleteDialogCancel}</AlertDialogCancel>
              <AlertDialogAction
                type="button"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  const id = deleteTarget?.id;
                  setDeleteTarget(null);
                  if (id) void deleteAudit(id);
                }}
              >
                {dashboardAuditsListCopy.deleteDialogConfirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </AppShell>
  );
}
