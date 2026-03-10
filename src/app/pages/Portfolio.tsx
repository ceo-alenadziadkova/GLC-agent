import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';
import {
  Plus, Search, ArrowUpRight, MoreHorizontal,
  Building2, MapPin, Calendar, TrendingUp, AlertTriangle, Users, Activity
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { ScoreBadge, ScoreDot } from '../components/glc/ScoreBadge';
import { StatusPill } from '../components/glc/StatusPill';
import { SectionLabel } from '../components/glc/SectionLabel';

const CLIENTS = [
  { id: 'hotel-xyz',        name: 'Hotel XYZ',        industry: 'Hospitality',  country: 'Mallorca, ES', score: 3, status: 'completed' as const, lastAudit: 'Mar 9, 2026',  critical: 2, pkg: 'Growth Audit'  },
  { id: 'finca-sol',        name: 'Finca Sol',         industry: 'Real Estate',  country: 'Mallorca, ES', score: 2, status: 'running'   as const, lastAudit: 'Mar 10, 2026', critical: 5, pkg: 'Deep Audit'    },
  { id: 'nautic-blue',      name: 'Nautic Blue',       industry: 'Marine',       country: 'Palma, ES',    score: 4, status: 'completed' as const, lastAudit: 'Feb 28, 2026', critical: 1, pkg: 'Starting Point' },
  { id: 'clinica-mas',      name: 'Clínica Mas',       industry: 'Healthcare',   country: 'Inca, ES',     score: 2, status: 'review'    as const, lastAudit: 'Mar 8, 2026',  critical: 4, pkg: 'Growth Audit'  },
  { id: 'restaurante-cala', name: 'Restaurante Cala',  industry: 'F&B',          country: 'Sóller, ES',   score: 0, status: 'pending'   as const, lastAudit: '—',            critical: 0, pkg: '—'             },
  { id: 'blue-sail',        name: 'Blue Sail Yachts',  industry: 'Marine',       country: 'Palma, ES',    score: 5, status: 'completed' as const, lastAudit: 'Feb 14, 2026', critical: 0, pkg: 'Starting Point' },
];

const METRICS = [
  { label: 'Total Clients',   value: '12',  sub: '+3 this month',    Icon: Users,         color: 'var(--glc-blue)'   },
  { label: 'Active Audits',   value: '3',   sub: '2 in pipeline',    Icon: Activity,      color: 'var(--glc-orange)' },
  { label: 'Avg Score',       value: '3.2', sub: 'Across 8 domains', Icon: TrendingUp,    color: 'var(--glc-green)'  },
  { label: 'Critical Issues', value: '14',  sub: 'Need attention',   Icon: AlertTriangle, color: 'var(--score-1)'    },
];

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
};

export function Portfolio() {
  const [query, setQuery] = useState('');
  const filtered = CLIENTS.filter(c =>
    query === '' ||
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.industry.toLowerCase().includes(query.toLowerCase())
  );

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
          className="grid grid-cols-4 gap-3"
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
              transition: 'border-color var(--ease-fast), box-shadow var(--ease-fast)',
              borderRadius: 'var(--radius-md)',
            }}
            onFocusCapture={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--glc-blue)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-blue)';
            }}
            onBlurCapture={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search clients..."
              className="flex-1 bg-transparent outline-none"
              style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}
            />
          </div>
          <button className="glc-btn-secondary">All Status</button>
          <button className="glc-btn-secondary">All Industries</button>
        </div>

        {/* ── Table ─────────────────────────────────── */}
        <div className="glc-card overflow-hidden" style={{ borderRadius: 'var(--radius-xl)' }}>
          {/* Header */}
          <div
            className="grid px-5 py-3"
            style={{
              gridTemplateColumns: '2fr 1fr 1fr 88px 128px 72px 1fr 40px',
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
            <span>Last Audit</span>
            <span>Score</span>
            <span>Status</span>
            <span>Critical</span>
            <span>Package</span>
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
                  gridTemplateColumns: '2fr 1fr 1fr 88px 128px 72px 1fr 40px',
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
                    {c.name.slice(0, 2).toUpperCase()}
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
                        transition: 'color var(--ease-fast)',
                      }}
                      onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--glc-blue)'; }}
                      onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--text-primary)'; }}
                    >
                      {c.name}
                    </Link>
                    <div className="flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-quaternary)', fontSize: '11px' }}>
                      <MapPin className="w-2.5 h-2.5" />{c.country}
                    </div>
                  </div>
                </div>

                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{c.industry}</span>

                <div className="flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />{c.lastAudit}
                </div>

                {c.score > 0
                  ? <ScoreBadge score={c.score} size="sm" />
                  : <span style={{ color: 'var(--text-quaternary)', fontSize: 'var(--text-sm)' }}>—</span>
                }

                <StatusPill status={c.status} pulse={c.status === 'running'} />

                <div className="flex items-center gap-1.5">
                  {c.critical > 0 ? (
                    <>
                      <ScoreDot score={1} size={6} />
                      <span
                        className="font-bold tabular-nums"
                        style={{ color: 'var(--score-1)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}
                      >
                        {c.critical}
                      </span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-quaternary)', fontSize: 'var(--text-sm)' }}>—</span>
                  )}
                </div>

                <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>{c.pkg}</span>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    to={`/audit/${c.id}`}
                    className="glc-btn-icon"
                    style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)' }}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                  <button className="glc-btn-icon" style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)' }}>
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="py-14 text-center" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
              No clients match "{query}"
            </div>
          )}
        </div>

        {/* ── Add new ───────────────────────────────── */}
        <motion.div
          whileHover={{ y: -1 }}
          transition={{ duration: 0.18 }}
          className="p-5 flex items-center justify-between"
          style={{
            border: '1.5px dashed var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'var(--bg-surface)',
            transition: 'border-color var(--ease-fast)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--glc-blue)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; }}
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
