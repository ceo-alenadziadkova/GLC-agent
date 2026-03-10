import { motion } from 'motion/react';
import { Link } from 'react-router';
import {
  Plus, Search, Filter, ArrowUpRight, MoreHorizontal,
  Building2, MapPin, Calendar
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { ScoreBadge, ScoreDot } from '../components/glc/ScoreBadge';
import { StatusPill } from '../components/glc/StatusPill';
import { SectionLabel } from '../components/glc/SectionLabel';

const CLIENTS = [
  { id: 'hotel-xyz',        name: 'Hotel XYZ',        industry: 'Hospitality',    country: 'Mallorca, ES', score: 3, status: 'completed' as const, lastAudit: 'Mar 9, 2026',  critical: 2, pkg: 'Growth Audit'  },
  { id: 'finca-sol',        name: 'Finca Sol',         industry: 'Real Estate',    country: 'Mallorca, ES', score: 2, status: 'running' as const,   lastAudit: 'Mar 10, 2026', critical: 5, pkg: 'Deep Audit'    },
  { id: 'nautic-blue',      name: 'Nautic Blue',       industry: 'Marine',         country: 'Palma, ES',    score: 4, status: 'completed' as const, lastAudit: 'Feb 28, 2026', critical: 1, pkg: 'Starting Point' },
  { id: 'clinica-mas',      name: 'Clínica Mas',       industry: 'Healthcare',     country: 'Inca, ES',     score: 2, status: 'review' as const,    lastAudit: 'Mar 8, 2026',  critical: 4, pkg: 'Growth Audit'  },
  { id: 'restaurante-cala', name: 'Restaurante Cala',  industry: 'F&B',            country: 'Sóller, ES',   score: 0, status: 'pending' as const,   lastAudit: '—',            critical: 0, pkg: '—'             },
  { id: 'blue-sail',        name: 'Blue Sail Yachts',  industry: 'Marine',         country: 'Palma, ES',    score: 5, status: 'completed' as const, lastAudit: 'Feb 14, 2026', critical: 0, pkg: 'Starting Point' },
];

const METRICS = [
  { label: 'Total Clients', value: '12', sub: '+3 this month' },
  { label: 'Active Audits', value: '3',  sub: '2 in pipeline'  },
  { label: 'Avg Score',     value: '3.2',sub: 'Across 8 domains'},
  { label: 'Critical Issues',value: '14',sub: 'Need attention'  },
];

export function Portfolio() {
  return (
    <AppShell
      title="Client Portfolio"
      subtitle="All consulting clients and audit history"
      actions={
        <Link
          to="/audit"
          className="glc-btn-primary"
          style={{ textDecoration: 'none' }}
        >
          <Plus className="w-4 h-4" />
          New Audit
        </Link>
      }
    >
      <div className="px-7 py-5 space-y-5">
        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-3">
          {METRICS.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glc-card p-4"
            >
              <SectionLabel>{m.label}</SectionLabel>
              <div
                className="mt-2 font-semibold"
                style={{ fontSize: 'var(--text-2xl)', color: 'var(--text-primary)', letterSpacing: 'var(--tracking-tight)' }}
              >
                {m.value}
              </div>
              <div className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>{m.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-md flex-1 max-w-xs"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
          >
            <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search clients..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
          <button className="glc-btn-secondary">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        {/* Table */}
        <div className="glc-card overflow-hidden">
          {/* Header */}
          <div
            className="grid text-xs font-semibold px-5 py-2.5"
            style={{
              gridTemplateColumns: '2fr 1fr 1fr 80px 110px 70px 1fr 48px',
              color: 'var(--text-tertiary)',
              borderBottom: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-canvas)',
              letterSpacing: 'var(--tracking-wider)',
              textTransform: 'uppercase',
            }}
          >
            <span>Company</span><span>Industry</span><span>Last Audit</span>
            <span>Score</span><span>Status</span><span>Critical</span>
            <span>Package</span><span />
          </div>

          {/* Rows */}
          {CLIENTS.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="grid items-center px-5 py-3 group transition-colors cursor-pointer"
              style={{
                gridTemplateColumns: '2fr 1fr 1fr 80px 110px 70px 1fr 48px',
                borderBottom: i < CLIENTS.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-canvas)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
            >
              {/* Company */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, var(--glc-blue-xlight) 0%, var(--glc-blue-light) 100%)',
                    color: 'var(--glc-blue-dark)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <Link
                    to={`/audit/${c.id}`}
                    className="text-sm font-medium hover:text-blue-500 truncate block transition-colors"
                    style={{ color: 'var(--text-primary)', textDecoration: 'none' }}
                  >
                    {c.name}
                  </Link>
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <MapPin className="w-3 h-3" />{c.country}
                  </div>
                </div>
              </div>

              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{c.industry}</span>

              <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                {c.lastAudit}
              </div>

              {c.score > 0 ? <ScoreBadge score={c.score} size="sm" /> : <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>—</span>}

              <StatusPill status={c.status} pulse={c.status === 'running'} />

              <div className="flex items-center gap-1.5">
                {c.critical > 0 ? (
                  <>
                    <ScoreDot score={1} size={6} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--score-1)' }}>{c.critical}</span>
                  </>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>—</span>
                )}
              </div>

              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{c.pkg}</span>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                  to={`/audit/${c.id}`}
                  className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
                <button className="p-1.5 rounded hover:bg-gray-100 transition-colors" style={{ color: 'var(--text-tertiary)' }}>
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Add new */}
        <div
          className="rounded-lg p-5 flex items-center justify-between"
          style={{ border: '1px dashed var(--border-default)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--glc-blue-xlight)', color: 'var(--glc-blue)' }}
            >
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Add a new client</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Start a new audit by entering a company URL</p>
            </div>
          </div>
          <Link to="/audit" className="glc-btn-primary" style={{ textDecoration: 'none' }}>
            <Plus className="w-4 h-4" />
            Start Audit
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
