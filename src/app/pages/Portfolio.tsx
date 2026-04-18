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

const EASE_GLC = [0.16, 1, 0.3, 1] as const;

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_GLC } },
};

function mapStatus(status: string): 'completed' | 'running' | 'pending' | 'review' | 'cancelled' {
  if (status === 'completed') return 'completed';
  if (status === 'failed') return 'review';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'created') return 'pending';
  return 'running';
}

export function Portfolio() {
  const { audits, loading, error } = useAudits();
  const [query, setQuery] = useState('');

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
    { label: 'Total Audits', value: String(totalAudits), sub: 'All time', Icon: Users, tone: 'text-info border-info/40 bg-info/10' },
    { label: 'Active', value: String(activeAudits), sub: 'In pipeline', Icon: Pulse, tone: 'text-warning border-warning/40 bg-warning/10' },
    { label: 'Avg Score', value: avgScore, sub: 'Across all audits', Icon: TrendUp, tone: 'text-success border-success/40 bg-success/10' },
  ];

  return (
    <AppShell
      title="Admin portfolio"
      subtitle={WORKSPACE_PAGE_COPY.portfolio.appShellSubtitle}
      actions={
        <Button asChild variant="default" className="no-underline">
          <Link to="/audit/new">
            <Plus className="w-4 h-4" /> New Audit
          </Link>
        </Button>
      }
    >
      <div className={cn('glc-page-content', PAGE_SHELL_CONTRACTS.root, 'space-y-6')}>

        {/* ── KPI strip ─────────────────────────────── */}
        <motion.div
          className="grid grid-cols-3 gap-3"
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
        <div className="flex items-center gap-3">
          <div className="bg-card flex max-w-xs flex-1 items-center gap-2 rounded-md border px-3 py-2">
            <MagnifyingGlass className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0" />
            <Input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search audits..."
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
          <div className="glc-card overflow-hidden rounded-xl">
            {/* Header */}
            <div className="text-muted-foreground bg-background grid border-b px-5 py-3 text-[length:var(--text-2xs)] font-bold uppercase ds-data-table-header-caps [grid-template-columns:2fr_1fr_1fr_88px_128px_40px]">
              <span>Company</span>
              <span>Industry</span>
              <span>Created</span>
              <span>Score</span>
              <span>Status</span>
              <span />
            </div>

            {/* Rows */}
            <AnimatePresence initial={false}>
              {filtered.map((c, i) => (
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
                      {(c.company_name || formatAuditWebsiteDisplay(c.company_url, c.no_public_website)).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/audit/${c.id}`}
                        className="text-foreground block truncate text-sm font-semibold no-underline"
                      >
                        {c.company_name || formatAuditWebsiteDisplay(c.company_url, c.no_public_website)}
                      </Link>
                      <div className="text-muted-foreground mt-0.5 truncate text-xs">
                        {formatAuditWebsiteDisplay(c.company_url, c.no_public_website)}
                      </div>
                    </div>
                  </div>

                  <span className="text-muted-foreground text-sm">{c.industry || '—'}</span>

                  <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>

                  {c.overall_score !== null
                    ? <ScoreBadge score={Math.round(c.overall_score)} size="sm" />
                    : <span className="text-muted-foreground text-sm">—</span>
                  }

                  <StatusPill status={mapStatus(c.status)} pulse={mapStatus(c.status) === 'running'} />

                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      to={c.status === 'created' ? `/pipeline/${c.id}` : `/audit/${c.id}`}
                      className="glc-btn-icon h-7 w-7 rounded-md"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filtered.length === 0 && (
              <div className="text-muted-foreground py-14 text-center text-sm">
                No audits match "{query}"
              </div>
            )}
          </div>
        )}

        {!loading && audits.length === 0 && !error && (
          <div className="text-muted-foreground py-14 text-center">
            <Buildings className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
            <p className="text-sm font-medium">No audits yet</p>
            <p className="text-xs mt-1">Start your first audit to see it here</p>
          </div>
        )}

        {/* ── Add new ───────────────────────────────── */}
        <motion.div
          whileHover={{ y: -1 }}
          transition={{ duration: 0.18 }}
          className="bg-card flex items-center justify-between rounded-xl border border-dashed p-5"
        >
          <div className="flex items-center gap-3">
            <div
              className="text-info border-info/30 bg-info/10 flex h-10 w-10 items-center justify-center rounded-xl border"
            >
              <Buildings className="w-5 h-5" />
            </div>
            <div>
              <p
                className="text-foreground text-sm font-semibold"
              >
                Add a new client
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Start a new audit by entering a company URL
              </p>
            </div>
          </div>
          <Button asChild variant="default" className="no-underline">
            <Link to="/audit/new">
              <Plus className="w-4 h-4" /> Start Audit
            </Link>
          </Button>
        </motion.div>
      </div>
    </AppShell>
  );
}
