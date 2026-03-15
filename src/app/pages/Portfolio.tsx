import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';
import {
  Plus, Search, ArrowUpRight, MoreHorizontal,
  Building2, Calendar, TrendingUp, AlertTriangle, Users, Activity, RefreshCw, Trash2
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { ScoreBadge, ScoreDot } from '../components/glc/ScoreBadge';
import { StatusPill } from '../components/glc/StatusPill';
import { SectionLabel } from '../components/glc/SectionLabel';
import { useAudits } from '../hooks/useAudits';
import type { AuditMeta } from '../data/auditTypes';

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};
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

export function Portfolio() {
  const { audits, loading, error, deleteAudit } = useAudits();
  const [query, setQuery] = useState('');

  const filtered = audits.filter(c =>
    query === '' ||
    (c.company_name || '').toLowerCase().includes(query.toLowerCase()) ||
    (c.industry || '').toLowerCase().includes(query.toLowerCase()) ||
    c.company_url.toLowerCase().includes(query.toLowerCase())
  );

  const totalAudits = audits.length;
  const activeAudits = audits.filter(a => !['completed', 'failed', 'created'].includes(a.status)).length;
  const completedWithScores = audits.filter(a => a.overall_score !== null);
  const avgScore = completedWithScores.length > 0
    ? (completedWithScores.reduce((s, a) => s + (a.overall_score ?? 0), 0) / completedWithScores.length).toFixed(1)
    : '—';

  const METRICS = [
    { label: 'Total Audits',    value: String(totalAudits), sub: 'All time',          Icon: Users,         color: 'var(--glc-blue)'   },
    { label: 'Active',          value: String(activeAudits),sub: 'In pipeline',        Icon: Activity,      color: 'var(--glc-orange)' },
    { label: 'Avg Score',       value: avgScore,            sub: 'Across all audits',  Icon: TrendingUp,    color: 'var(--glc-green)'  },
  ];

  return (
    <AppShell
      title="Client Portfolio"
      subtitle="All consulting clients and audit history"
      actions={
        <Link to="/audit/new" className="glc-btn-primary" style={{ textDecoration: 'none' }}>
          <Plus className="w-4 h-4" /> New Audit
        </Link>
      }
    >
      <div className="px-7 py-6 space-y-6">

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
              className="glc-card p-4 cursor-default"
              style={{ borderRadius: 'var(--radius-xl)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <SectionLabel>{m.label}</SectionLabel>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${m.color}18`, borderRadius: 'var(--radius-md)' }}
                >
                  <m.Icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                </div>
              </div>
              <div
                className="font-bold tabular-nums"
                style={{
                  fontSize: 'var(--text-3xl)',
                  color: 'var(--text-primary)',
                  letterSpacing: 'var(--tracking-tight)',
                  fontFamily: 'var(--font-display)',
                  lineHeight: 1,
                }}
              >
                {m.value}
              </div>
              <div className="mt-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>{m.sub}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Toolbar ───────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 max-w-xs"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
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

        {loading && audits.length === 0 && (
          <div className="flex items-center justify-center py-10">
            <RefreshCw className="w-5 h-5 animate-spin" style={{ color: 'var(--glc-blue)' }} />
          </div>
        )}

        {error && (
          <div className="text-center py-4">
            <p className="text-sm" style={{ color: 'var(--score-1)' }}>{error}</p>
          </div>
        )}

        {/* ── Table ─────────────────────────────────── */}
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

            {/* Rows */}
            <AnimatePresence initial={false}>
              {filtered.map((c, i) => (
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
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filtered.length === 0 && (
              <div className="py-14 text-center" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                No audits match "{query}"
              </div>
            )}
          </div>
        )}

        {!loading && audits.length === 0 && !error && (
          <div className="text-center py-14" style={{ color: 'var(--text-tertiary)' }}>
            <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-quaternary)' }} />
            <p className="text-sm font-medium">No audits yet</p>
            <p className="text-xs mt-1">Start your first audit to see it here</p>
          </div>
        )}

        {/* ── Add new ───────────────────────────────── */}
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
              <Building2 className="w-5 h-5" />
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
