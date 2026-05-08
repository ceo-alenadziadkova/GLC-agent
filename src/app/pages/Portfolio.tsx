import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';
import {
  Plus, MagnifyingGlass, ArrowUpRight,
  Buildings, Calendar, TrendUp, Users, Pulse, ArrowsClockwise,
} from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { ScoreBadge } from '../components/glc/ScoreBadge';
import { StatusPill } from '../components/glc/StatusPill';
import { SectionLabel } from '../components/glc/SectionLabel';
import { useAudits } from '../hooks/useAudits';
import { formatAuditWebsiteDisplay } from '../data/no-public-website';
import { WORKSPACE_PAGE_COPY } from '../config/workspace-page-copy';
import { Input } from '../components/ui/input';
import { cn } from '../components/ui/utils';
import { Button } from '../components/ui/button';
import { PAGE_SHELL_CONTRACTS } from '../../design-system/patterns/Layouts';
import { getAuditListPillPresentation } from '../lib/pipeline-monitor-helpers';
import { formatAppShortDate } from '../lib/date-format';
import { QueueInlineActionLink } from './queue-inline-action-link';
import { buildAppRoute } from '../config/route-paths';

const EASE_GLC = [0.16, 1, 0.3, 1] as const;

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_GLC } },
};

function formatPortfolioDate(isoDate: string): string {
  return formatAppShortDate(isoDate);
}

function formatPortfolioOpenAriaLabel(template: string, company: string): string {
  return template.replace('{{company}}', company);
}

function PortfolioAuditMobileCard({
  companyLabel,
  websiteLabel,
  industry,
  createdAt,
  auditId,
  status,
  overallScore,
  openButtonLabel,
  openIconAriaLabel,
}: {
  companyLabel: string;
  websiteLabel: string;
  industry: string | null;
  createdAt: string;
  auditId: string;
  status: string;
  overallScore: number | null;
  openButtonLabel: string;
  openIconAriaLabel: string;
}) {
  const statusPill = getAuditListPillPresentation(status);
  return (
    <div className="glc-card rounded-xl p-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="text-info border-info/30 bg-info/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold">
          {companyLabel.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            to={
              status === 'created'
                ? buildAppRoute.auditNewResumeDraft(auditId)
                : buildAppRoute.audit(auditId)
            }
            className="text-foreground block truncate text-sm font-semibold no-underline"
          >
            {companyLabel}
          </Link>
          <div className="text-muted-foreground mt-0.5 truncate text-xs">{websiteLabel}</div>
          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span>{industry || '—'}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              {formatPortfolioDate(createdAt)}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {overallScore !== null ? (
              <ScoreBadge score={Math.round(overallScore)} size="sm" />
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
            <StatusPill status={statusPill.status} pulse={statusPill.pulse} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end border-t pt-3">
        <Button asChild variant="outline" size="sm" className="glc-touch-target no-underline">
          <Link
            to={
              status === 'created'
                ? buildAppRoute.auditNewResumeDraft(auditId)
                : buildAppRoute.audit(auditId)
            }
            aria-label={openIconAriaLabel}
          >
            <ArrowUpRight className="h-4 w-4" /> {openButtonLabel}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function Portfolio() {
  const { audits, loading, error, hasMore, loadMore, total } = useAudits();
  const [query, setQuery] = useState('');
  const portfolioCopy = WORKSPACE_PAGE_COPY.portfolio;
  const portfolioAuditsListCopy = WORKSPACE_PAGE_COPY.portfolio.auditsList;

  const filtered = audits.filter(c =>
    query === '' ||
    (c.company_name || '').toLowerCase().includes(query.toLowerCase()) ||
    (c.industry || '').toLowerCase().includes(query.toLowerCase()) ||
    c.company_url.toLowerCase().includes(query.toLowerCase()) ||
    formatAuditWebsiteDisplay(c.company_url, c.no_public_website).toLowerCase().includes(query.toLowerCase())
  );

  const totalAudits = audits.length;
  const activeAudits = audits.filter(a => !['completed', 'failed', 'cancelled', 'created'].includes(a.status)).length;
  const completedWithScores = audits.filter(a => a.overall_score !== null);
  const avgScore = completedWithScores.length > 0
    ? (completedWithScores.reduce((s, a) => s + (a.overall_score ?? 0), 0) / completedWithScores.length).toFixed(1)
    : '—';

  const METRICS = [
    { label: portfolioCopy.metrics.totalAuditsLabel, value: String(totalAudits), sub: portfolioCopy.metrics.totalAuditsSub, Icon: Users, tone: 'text-info border-info/40 bg-info/10' },
    { label: portfolioCopy.metrics.activeLabel, value: String(activeAudits), sub: portfolioCopy.metrics.activeSub, Icon: Pulse, tone: 'text-warning border-warning/40 bg-warning/10' },
    { label: portfolioCopy.metrics.avgScoreLabel, value: avgScore, sub: portfolioCopy.metrics.avgScoreSub, Icon: TrendUp, tone: 'text-success border-success/40 bg-success/10' },
  ];

  return (
    <AppShell
      title={portfolioCopy.appShellTitle}
      subtitle={portfolioCopy.appShellSubtitle}
      actions={
        <Button asChild variant="default" className="no-underline">
          <Link to="/audit/new">
            <Plus className="w-4 h-4" /> {portfolioCopy.newAuditButton}
          </Link>
        </Button>
      }
    >
      <div className={cn('glc-page-content', PAGE_SHELL_CONTRACTS.root, 'space-y-6')}>

        {/* ── KPI strip ─────────────────────────────── */}
        <motion.div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          variants={listVariants}
          initial="hidden"
          animate="visible"
        >
          {METRICS.map((m) => (
            <motion.div
              key={m.label}
              variants={itemVariants}
              whileHover={{ y: -2, boxShadow: 'var(--shadow-md)' }}
              transition={{ duration: 0.18 }}
              className="glc-card cursor-default rounded-xl p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <SectionLabel>{m.label}</SectionLabel>
                <div
                  className={cn('flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border', m.tone)}
                >
                  <m.Icon className={cn('h-3.5 w-3.5', m.tone.split(' ')[0])} />
                </div>
              </div>
              <div className="text-foreground text-3xl font-bold tabular-nums tracking-tight leading-none">
                {m.value}
              </div>
              <div className="text-muted-foreground mt-1.5 text-xs">{m.sub}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Toolbar ───────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="bg-card flex w-full items-center gap-2 rounded-md border px-3 py-2 sm:max-w-xs sm:flex-1">
            <MagnifyingGlass className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0" />
            <Input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={portfolioAuditsListCopy.searchPlaceholder}
              className="h-auto flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        {loading && audits.length === 0 && (
          <div className="flex items-center justify-center py-10">
            <ArrowsClockwise className="text-info h-5 w-5 animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-center py-4">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {/* ── Table ─────────────────────────────────── */}
        {filtered.length > 0 && (
          <>
          <div className="glc-card hidden overflow-hidden rounded-xl sm:block">
            {/* Header */}
            <div className="text-muted-foreground bg-background grid border-b px-5 py-3 text-[length:var(--text-2xs)] font-bold uppercase ds-data-table-header-caps [grid-template-columns:2fr_1fr_1fr_88px_128px_40px]">
              <span>{portfolioAuditsListCopy.headerCompany}</span>
              <span>{portfolioAuditsListCopy.headerIndustry}</span>
              <span>{portfolioAuditsListCopy.headerCreated}</span>
              <span>{portfolioAuditsListCopy.headerScore}</span>
              <span>{portfolioAuditsListCopy.headerStatus}</span>
              <span />
            </div>

            {/* Rows */}
            <AnimatePresence initial={false}>
              {filtered.map((c, i) => {
                const companyLabel = c.company_name || formatAuditWebsiteDisplay(c.company_url, c.no_public_website);
                const statusPill = getAuditListPillPresentation(c.status);
                return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ delay: i * 0.025, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className={`group grid cursor-pointer items-center px-5 py-3.5 transition-colors [grid-template-columns:2fr_1fr_1fr_88px_128px_40px] ${i < filtered.length - 1 ? 'border-b' : ''} hover:bg-background`}
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
                        to={
                          c.status === 'created'
                            ? buildAppRoute.auditNewResumeDraft(c.id)
                            : buildAppRoute.audit(c.id)
                        }
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
                    {formatPortfolioDate(c.created_at)}
                  </div>

                  {c.overall_score !== null
                    ? <ScoreBadge score={Math.round(c.overall_score)} size="sm" />
                    : <span className="text-muted-foreground text-sm">—</span>
                  }

                  <StatusPill status={statusPill.status} pulse={statusPill.pulse} />

                  <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <QueueInlineActionLink
                      to={
                        c.status === 'created'
                          ? buildAppRoute.auditNewResumeDraft(c.id)
                          : buildAppRoute.audit(c.id)
                      }
                      tone="info"
                      className="h-7 w-7 rounded-md p-0"
                      ariaLabel={formatPortfolioOpenAriaLabel(portfolioAuditsListCopy.openIconAriaLabel, companyLabel)}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </QueueInlineActionLink>
                  </div>
                </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          <div className="space-y-3 sm:hidden">
            {filtered.map((c) => {
              const companyLabel = c.company_name || formatAuditWebsiteDisplay(c.company_url, c.no_public_website);
              const websiteLabel = formatAuditWebsiteDisplay(c.company_url, c.no_public_website);
              return (
                <PortfolioAuditMobileCard
                  key={c.id}
                  companyLabel={companyLabel}
                  websiteLabel={websiteLabel}
                  industry={c.industry}
                  createdAt={c.created_at}
                  auditId={c.id}
                  status={c.status}
                  overallScore={c.overall_score}
                  openButtonLabel={portfolioAuditsListCopy.openButton}
                  openIconAriaLabel={formatPortfolioOpenAriaLabel(portfolioAuditsListCopy.openIconAriaLabel, companyLabel)}
                />
              );
            })}
          </div>
          </>
        )}

        {query && filtered.length === 0 && audits.length > 0 && !loading && !error && (
          <div className="text-muted-foreground py-14 text-center text-sm">
            {portfolioAuditsListCopy.searchNoMatchesPrefix}
            {query}
            {portfolioAuditsListCopy.searchNoMatchesSuffix}
          </div>
        )}

        {!loading && audits.length === 0 && !error && (
          <div className="text-muted-foreground py-14 text-center">
            <Buildings className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
            <p className="text-sm font-medium">{portfolioAuditsListCopy.emptyTitle}</p>
            <p className="text-xs mt-1">{portfolioAuditsListCopy.emptySubtitle}</p>
          </div>
        )}

        {!error && !query && total > audits.length && (
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p className="text-muted-foreground text-xs">
              {portfolioAuditsListCopy.showingOfTotal
                .replace('{{shown}}', String(audits.length))
                .replace('{{total}}', String(total))}
            </p>
            {hasMore && (
              <Button type="button" variant="outline" size="sm" onClick={loadMore}>
                {portfolioAuditsListCopy.loadMoreButton}
              </Button>
            )}
          </div>
        )}

        {/* ── Add new ───────────────────────────────── */}
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
                {portfolioCopy.cta.title}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {portfolioCopy.cta.subtitle}
              </p>
            </div>
          </div>
          <Button asChild variant="default" className="glc-touch-target w-full no-underline sm:w-auto">
            <Link to="/audit/new">
              <Plus className="w-4 h-4" /> {portfolioCopy.cta.button}
            </Link>
          </Button>
        </motion.div>
      </div>
    </AppShell>
  );
}
