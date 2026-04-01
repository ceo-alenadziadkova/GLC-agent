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

const itemVariants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
};

function mapStatus(status: string): 'completed' | 'running' | 'pending' | 'review' {
  if (status === 'completed') return 'completed';
  if (status === 'failed') return 'review';
  if (status === 'created') return 'pending';
  return 'running';
}

export function Dashboard() {
  // Analytics panels — independent fetch from the audit list
  const { data: dashData, loading: dashLoading, error: dashError, reloadDashboard } = useDashboard();
  // Audit list — existing paginated fetch
  const { audits, loading: auditsLoading, error: auditsError, deleteAudit } = useAudits();
  const [query, setQuery] = useState('');

  const filtered = audits.filter(c =>
    query === '' ||
    (c.company_name || '').toLowerCase().includes(query.toLowerCase()) ||
    (c.industry || '').toLowerCase().includes(query.toLowerCase()) ||
    c.company_url.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AppShell
      title="Dashboard"
      subtitle="Operational overview — audits, pipeline health, and client requests"
      actions={
        <Link to="/audit/new" className="glc-btn-primary" style={{ textDecoration: 'none' }}>
          <Plus className="w-4 h-4" /> New Audit
        </Link>
      }
    >
      <div className="px-7 py-6 space-y-8">

        {/* ── 1. KPI strip ──────────────────────────────────────── */}
        <KpiStrip kpis={dashData?.kpis} loading={dashLoading} />

        {/* ── Analytics error banner (non-fatal) ────────────────── */}
        {dashError && !dashLoading && (
          <div
            className="px-4 py-2.5 rounded-lg text-xs flex items-center gap-2"
            style={{
              backgroundColor: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: 'var(--score-1)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <ArrowsClockwise className="w-3.5 h-3.5 flex-shrink-0" />
            Some dashboard panels are temporarily unavailable. Audit list is unaffected.
          </div>
        )}

        {/* ── 2. Action Required (2/3) + Score Distribution (1/3) ── */}
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2">
            <ActionPanel
              items={dashData?.action_items}
              loading={dashLoading}
              onRefresh={reloadDashboard}
            />
          </div>
          <div className="col-span-1">
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
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>All Audits</SectionLabel>
            {/* Search */}
            <div
              className="flex items-center gap-2 px-3 py-2"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                minWidth: 220,
              }}
            >
              <MagnifyingGlass className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search audits..."
                className="flex-1 bg-transparent outline-none"
                style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {auditsLoading && audits.length === 0 && (
            <div className="flex items-center justify-center py-10">
              <ArrowsClockwise className="w-5 h-5 animate-spin" style={{ color: 'var(--glc-blue)' }} />
            </div>
          )}

          {auditsError && (
            <div className="text-center py-4">
              <p className="text-sm" style={{ color: 'var(--score-1)' }}>{auditsError}</p>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="glc-card overflow-hidden" style={{ borderRadius: 'var(--radius-xl)' }}>
              {/* Header */}
              <div
                className="grid px-5 py-3"
                style={{
                  gridTemplateColumns: '2fr 1fr 1fr 88px 128px 40px',
                  color: 'var(--text-quaternary)',
                  borderBottom: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-canvas)',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                }}
              >
                <span>Company</span>
                <span>Industry</span>
                <span>Created</span>
                <span>Score</span>
                <span>Status</span>
                <span />
              </div>

              <AnimatePresence initial={false}>
                {filtered.map((c: AuditMeta, i: number) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ delay: i * 0.025, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="grid items-center px-5 py-3.5 group cursor-pointer"
                    style={{
                      gridTemplateColumns: '2fr 1fr 1fr 88px 128px 40px',
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      transition: 'background var(--ease-fast)',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-canvas)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
                  >
                    {/* Company */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, var(--glc-blue-xlight) 0%, rgba(28,189,255,0.06) 100%)',
                          color: 'var(--glc-blue-deeper)',
                          border: '1px solid rgba(28,189,255,0.14)',
                          borderRadius: 'var(--radius-lg)',
                          fontFamily: 'var(--font-display)',
                          fontSize: '11px',
                        }}
                      >
                        {(c.company_name || c.company_url).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/audit/${c.id}`}
                          className="font-semibold truncate block"
                          style={{
                            color: 'var(--text-primary)',
                            textDecoration: 'none',
                            fontSize: 'var(--text-sm)',
                            fontFamily: 'var(--font-display)',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {c.company_name || c.company_url}
                        </Link>
                        <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-quaternary)', fontSize: '11px' }}>
                          {c.company_url}
                        </div>
                      </div>
                    </div>

                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{c.industry || '—'}</span>

                    <div className="flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                      <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                      {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>

                    {c.overall_score !== null
                      ? <ScoreBadge score={Math.round(c.overall_score)} size="sm" />
                      : <span style={{ color: 'var(--text-quaternary)', fontSize: 'var(--text-sm)' }}>—</span>
                    }

                    <StatusPill status={mapStatus(c.status)} pulse={mapStatus(c.status) === 'running'} />

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        to={c.status === 'created' ? `/pipeline/${c.id}` : `/audit/${c.id}`}
                        className="glc-btn-icon"
                        style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)' }}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        type="button"
                        className="glc-btn-icon"
                        style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', color: 'var(--score-1)' }}
                        onClick={async () => {
                          if (confirm(`Delete audit for ${c.company_name || c.company_url}?`)) {
                            await deleteAudit(c.id);
                          }
                        }}
                        title="Delete audit"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {filtered.length === 0 && query && (
                <div className="py-14 text-center" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                  No audits match "{query}"
                </div>
              )}
            </div>
          )}

          {!auditsLoading && audits.length === 0 && !auditsError && (
            <div className="text-center py-14" style={{ color: 'var(--text-tertiary)' }}>
              <Buildings className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-quaternary)' }} />
              <p className="text-sm font-medium">No audits yet</p>
              <p className="text-xs mt-1">Start your first audit to see it here</p>
            </div>
          )}
        </section>

        {/* ── Add new client CTA ─────────────────────────────────── */}
        <motion.div
          whileHover={{ y: -1 }}
          transition={{ duration: 0.18 }}
          className="p-5 flex items-center justify-between"
          style={{
            border: '1.5px dashed var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, var(--glc-blue-xlight), rgba(28,189,255,0.06))',
                color: 'var(--glc-blue)',
                border: '1px solid rgba(28,189,255,0.15)',
              }}
            >
              <Buildings className="w-5 h-5" />
            </div>
            <div>
              <p
                className="font-semibold"
                style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-display)' }}
              >
                Add a new client
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                Start a new audit by entering a company URL
              </p>
            </div>
          </div>
          <Link to="/audit/new" className="glc-btn-primary" style={{ textDecoration: 'none' }}>
            <Plus className="w-4 h-4" /> Start Audit
          </Link>
        </motion.div>

      </div>
    </AppShell>
  );
}
