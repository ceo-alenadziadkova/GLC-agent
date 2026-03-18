import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useParams } from 'react-router';
import {
  Server, Shield, Globe, MousePointer, Target, Zap, Map, Search,
  ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, ArrowUpRight, RefreshCw
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { ScoreBadge, ScoreBar, ScoreRing } from '../components/glc/ScoreBadge';
import { SectionLabel } from '../components/glc/SectionLabel';
import { StatusPill } from '../components/glc/StatusPill';
import { QuickWinTag } from '../components/glc/QuickWinTag';
import { useAudit } from '../hooks/useAudit';
import { DOMAIN_KEYS, DOMAIN_LABELS } from '../data/auditTypes';
import type { DomainKey, DomainData } from '../data/auditTypes';

const DOMAIN_ICONS: Record<DomainKey, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  tech_infrastructure: Server,
  security_compliance: Shield,
  seo_digital: Globe,
  ux_conversion: MousePointer,
  marketing_utp: Target,
  automation_processes: Zap,
};

const SEV_COLOR: Record<string, string> = {
  critical: 'var(--score-1)',
  high:   'var(--score-1)',
  medium: 'var(--score-3)',
  low:    'var(--text-tertiary)',
};
const SEV_BG: Record<string, string> = {
  critical: 'var(--score-1-bg)',
  high:   'var(--score-1-bg)',
  medium: 'var(--score-3-bg)',
  low:    'var(--bg-muted)',
};

export function AuditWorkspace() {
  const { id, domainId } = useParams<{ id: string; domainId?: string }>();
  const { audit, loading, error } = useAudit(id);
  const [openRec, setOpenRec] = useState<number | null>(null);
  const [activeDomain, setActiveDomain] = useState<DomainKey>(
    (domainId && DOMAIN_KEYS.includes(domainId as DomainKey)) ? (domainId as DomainKey) : DOMAIN_KEYS[0]
  );

  if (loading && !audit) {
    return (
      <AppShell title="Audit Workspace" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--glc-blue)' }} />
        </div>
      </AppShell>
    );
  }

  if (error || !audit) {
    return (
      <AppShell title="Audit Workspace" subtitle="Error">
        <div className="flex items-center justify-center h-64">
          <p style={{ color: 'var(--score-1)' }}>{error || 'Audit not found'}</p>
        </div>
      </AppShell>
    );
  }

  const domainData: DomainData | null = audit.domains[activeDomain] || null;
  const companyName = audit.meta.company_name || audit.meta.company_url;

  // Use server-calculated weighted overall score when available (set after Phase 7).
  // Fall back to unweighted average while pipeline is still running.
  const domainEntries = DOMAIN_KEYS.map(k => audit.domains[k]).filter((d): d is DomainData => d !== null && d.score !== null);
  const overallScore = audit.meta.overall_score
    ?? (domainEntries.length > 0
      ? +(domainEntries.reduce((s, d) => s + (d.score ?? 0), 0) / domainEntries.length).toFixed(1)
      : 0);

  return (
    <AppShell
      title="Audit Workspace"
      subtitle={`${companyName} · ${domainData ? DOMAIN_LABELS[activeDomain] : 'Select a domain'}`}
      actions={
        <div className="flex items-center gap-2">
          <StatusPill status={audit.meta.status === 'completed' ? 'completed' : 'running'} />
          <Link to={`/reports/${id}`} className="glc-btn-secondary" style={{ textDecoration: 'none' }}>
            Full Report <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      }
    >
      <div className="flex" style={{ height: 'calc(100vh - 56px)' }}>

        {/* ── Domain binder sidebar ─────────────────── */}
        <aside
          className="w-[232px] flex-shrink-0 overflow-y-auto flex flex-col"
          style={{ borderRight: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
        >
          {/* Score overview */}
          <div
            className="p-4 flex items-center gap-3"
            style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-canvas)' }}
          >
            <ScoreRing score={overallScore} size={48} />
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
                Overall Score
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                {domainEntries.length} domains analysed
              </p>
            </div>
          </div>

          {/* Domain nav */}
          <div className="px-2 py-2 space-y-0.5 flex-1">
            <div className="px-2 pb-1.5"><SectionLabel>Domains</SectionLabel></div>
            {DOMAIN_KEYS.map(key => {
              const I = DOMAIN_ICONS[key];
              const d = audit.domains[key];
              const active = key === activeDomain;
              const score = d?.score ?? 0;
              return (
                <motion.button
                  key={key}
                  onClick={() => { setActiveDomain(key); setOpenRec(null); }}
                  whileHover={{ x: 1 }}
                  transition={{ duration: 0.14 }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-left relative"
                  style={{
                    backgroundColor: active ? 'var(--glc-blue-xlight)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(28,189,255,0.22)' : 'transparent'}`,
                    borderLeft: `3px solid ${active ? 'var(--glc-blue)' : 'transparent'}`,
                    transition: 'all var(--ease-fast)',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-canvas)'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  <I
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: active ? 'var(--glc-blue)' : 'var(--text-tertiary)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-xs truncate font-medium"
                      style={{ color: active ? 'var(--glc-blue-deeper)' : 'var(--text-secondary)' }}
                    >
                      {DOMAIN_LABELS[key]}
                    </div>
                    {score > 0 && <div className="mt-0.5"><ScoreBar score={score} /></div>}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </aside>

        {/* ── Domain detail ─────────────────────────── */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-canvas)' }}>
          <AnimatePresence mode="wait">
            {domainData ? (
              <motion.div
                key={activeDomain}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-2xl mx-auto px-7 py-6 space-y-6"
              >
                {/* Domain header */}
                <div className="flex items-start gap-5">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--gradient-brand)', boxShadow: '0 6px 20px rgba(28,189,255,0.25)' }}
                  >
                    {(() => { const DI = DOMAIN_ICONS[activeDomain]; return <DI className="w-7 h-7 text-white" />; })()}
                  </div>
                  <div className="flex-1">
                    <h2
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'var(--text-xl)',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        letterSpacing: 'var(--tracking-tight)',
                      }}
                    >
                      {DOMAIN_LABELS[activeDomain]}
                    </h2>
                    <div className="flex items-center gap-3 mt-1.5">
                      {domainData.score !== null && <ScoreBadge score={domainData.score} showLabel size="md" />}
                      {domainData.summary && (
                        <>
                          <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>·</span>
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{domainData.summary}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Strengths */}
                {domainData.strengths.length > 0 && (
                  <div className="glc-card p-5" style={{ borderRadius: 'var(--radius-xl)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--glc-green)' }} />
                      <SectionLabel>Strengths</SectionLabel>
                    </div>
                    <ul className="space-y-2">
                      {domainData.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <span
                            className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: 'var(--gradient-success)' }}
                          />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Issues table */}
                {domainData.issues.length > 0 && (
                  <div className="glc-card overflow-hidden" style={{ borderRadius: 'var(--radius-xl)' }}>
                    <div
                      className="flex items-center gap-2 px-5 py-3"
                      style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-canvas)' }}
                    >
                      <AlertTriangle className="w-4 h-4" style={{ color: 'var(--score-1)' }} />
                      <SectionLabel>Issues Found</SectionLabel>
                      <span
                        className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ backgroundColor: 'var(--score-1-bg)', color: 'var(--score-1)', fontSize: '10px' }}
                      >
                        {domainData.issues.length}
                      </span>
                    </div>
                    <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                      {domainData.issues.map((issue, i) => (
                        <motion.div
                          key={issue.id || i}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                          className="flex items-center gap-3 px-5 py-3"
                        >
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-bold capitalize flex-shrink-0"
                            style={{
                              backgroundColor: SEV_BG[issue.severity] || SEV_BG.medium,
                              color: SEV_COLOR[issue.severity] || SEV_COLOR.medium,
                              fontSize: '10px',
                              minWidth: 48,
                              textAlign: 'center',
                            }}
                          >
                            {issue.severity}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{issue.title}</span>
                            {issue.description && (
                              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{issue.description}</p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {domainData.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <SectionLabel>Recommendations</SectionLabel>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {domainData.recommendations.length} actions
                      </span>
                    </div>

                    {domainData.recommendations.map((rec, i) => {
                      const open = openRec === i;
                      const isQuickWin = rec.priority === 'high' && rec.estimated_time;
                      return (
                        <div
                          key={rec.id || i}
                          className="glc-card overflow-hidden"
                          style={{
                            borderRadius: 'var(--radius-xl)',
                            borderLeft: isQuickWin ? '3px solid var(--glc-orange)' : '3px solid var(--border-default)',
                          }}
                        >
                          <button
                            onClick={() => setOpenRec(open ? null : i)}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                            style={{ transition: 'background var(--ease-fast)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-canvas)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className="text-sm font-medium"
                                  style={{
                                    color: 'var(--text-primary)',
                                    fontFamily: 'var(--font-display)',
                                    letterSpacing: '-0.01em',
                                  }}
                                >
                                  {rec.title}
                                </span>
                                {isQuickWin && <QuickWinTag time={rec.estimated_time} cost={rec.estimated_cost} />}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                <span>Priority: <strong style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{rec.priority}</strong></span>
                                <span>Impact: <strong style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{rec.impact}</strong></span>
                                {rec.estimated_time && <span>{rec.estimated_time}</span>}
                              </div>
                            </div>
                            <motion.div
                              animate={{ rotate: open ? 90 : 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex-shrink-0"
                            >
                              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                            </motion.div>
                          </button>

                          <AnimatePresence>
                            {open && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                style={{ overflow: 'hidden' }}
                              >
                                <div
                                  className="px-4 pb-4 pt-1 text-sm leading-relaxed"
                                  style={{
                                    color: 'var(--text-secondary)',
                                    borderTop: '1px solid var(--border-subtle)',
                                    backgroundColor: 'var(--bg-canvas)',
                                  }}
                                >
                                  <p className="pt-3">
                                    {rec.description}
                                    {rec.estimated_cost && ` Estimated cost: ${rec.estimated_cost}.`}
                                    {rec.estimated_time && ` Estimated time: ${rec.estimated_time}.`}
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}

              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center h-64"
              >
                <div className="text-center">
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    No data yet for this domain
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-quaternary)' }}>
                    Run the pipeline to generate analysis
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppShell>
  );
}
