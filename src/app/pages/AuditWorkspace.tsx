import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useParams } from 'react-router';
import {
  Search, Server, Shield, Globe, MousePointer, Target,
  Zap, Map, CheckCircle2, AlertTriangle, TrendingUp,
  ArrowRight, Clock, DollarSign, ExternalLink,
  ChevronDown, ChevronUp, ChevronRight
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { ScoreBadge, ScoreBar, ScoreRing } from '../components/glc/ScoreBadge';
import { StatusPill } from '../components/glc/StatusPill';
import { SectionLabel } from '../components/glc/SectionLabel';
import { QuickWinTag } from '../components/glc/QuickWinTag';
import { auditDomains } from '../data/auditData';

const DOMAIN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  recon: Search, 'tech-infrastructure': Server, security: Shield,
  seo: Globe, ux: MousePointer, marketing: Target,
  automation: Zap, strategy: Map,
};

const SEV_CFG = {
  critical: { color: 'var(--score-1)', bg: 'var(--score-1-bg)', label: 'Critical' },
  high:     { color: 'var(--score-2)', bg: 'var(--score-2-bg)', label: 'High'     },
  medium:   { color: 'var(--score-3)', bg: 'var(--score-3-bg)', label: 'Medium'   },
  low:      { color: 'var(--score-4)', bg: 'var(--score-4-bg)', label: 'Low'      },
};

function SevBadge({ sev }: { sev: string }) {
  const c = SEV_CFG[sev as keyof typeof SEV_CFG] ?? SEV_CFG.medium;
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: c.bg, color: c.color, borderRadius: 'var(--radius-xs)' }}
    >
      {c.label}
    </span>
  );
}

function RecCard({ rec }: { rec: any }) {
  const [open, setOpen] = useState(false);
  const pc = rec.priority === 'high' ? 'var(--score-1)' : rec.priority === 'medium' ? 'var(--score-3)' : 'var(--score-4)';
  return (
    <div className="glc-card overflow-hidden">
      <button
        className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2" style={{ backgroundColor: pc }} />
          <div className="min-w-0">
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{rec.title}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              <span style={{ color: pc, fontWeight: 600 }}>{rec.priority}</span>
              {' · '}{rec.estimatedTime}{' · '}{rec.estimatedCost}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0" style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-5 pt-3 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{rec.description}</p>
              <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{rec.estimatedTime}</span>
                <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{rec.estimatedCost}</span>
              </div>
              <div
                className="rounded-md px-3 py-2 text-xs"
                style={{ backgroundColor: 'var(--glc-blue-xlight)', color: 'var(--glc-blue-dark)' }}
              >
                <span className="font-semibold">Business impact: </span>{rec.impact}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AuditWorkspace() {
  const { domainId } = useParams<{ domainId?: string }>();
  const activeDomain = auditDomains.find(d => d.id === domainId) ?? auditDomains[0];
  const Icon = DOMAIN_ICONS[activeDomain.id] ?? Search;
  const idx = auditDomains.indexOf(activeDomain);
  const overall = +(auditDomains.reduce((s, d) => s + d.score, 0) / auditDomains.length).toFixed(1);

  return (
    <AppShell
      title="Audit Workspace"
      subtitle="Hotel XYZ · hotelxyz.com · Mallorca, Spain"
      actions={
        <div className="flex items-center gap-2">
          <StatusPill status="completed" />
          <Link to="/reports" className="glc-btn-secondary" style={{ textDecoration: 'none' }}>
            <ExternalLink className="w-3.5 h-3.5" />
            View Report
          </Link>
        </div>
      }
    >
      <div className="flex" style={{ height: 'calc(100vh - 56px)' }}>

        {/* ── Domain nav ─────────────────────────── */}
        <aside
          className="w-[220px] flex-shrink-0 flex flex-col overflow-y-auto"
          style={{ borderRight: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
        >
          {/* Summary */}
          <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <SectionLabel>Overall Health</SectionLabel>
            <div className="mt-3 flex items-center gap-3">
              <ScoreRing score={Math.round(overall)} size={52} />
              <div>
                <div className="font-bold text-2xl" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {overall}
                  <span className="text-base font-normal" style={{ color: 'var(--text-tertiary)' }}>/5</span>
                </div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>8 domains</div>
              </div>
            </div>
          </div>

          {/* Domain list */}
          <nav className="flex-1 py-1">
            {auditDomains.map(domain => {
              const DI = DOMAIN_ICONS[domain.id] ?? Search;
              const active = domain.id === activeDomain.id;
              return (
                <Link
                  key={domain.id}
                  to={`/audit/${domain.id}`}
                  className="flex items-center gap-2.5 px-4 py-2.5 transition-colors"
                  style={{
                    textDecoration: 'none',
                    backgroundColor: active ? 'var(--glc-blue-xlight)' : 'transparent',
                    borderRight: active ? `2px solid var(--glc-blue)` : '2px solid transparent',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-canvas)'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  <DI className="w-4 h-4 flex-shrink-0"
                    style={{ color: active ? 'var(--glc-blue)' : 'var(--text-tertiary)' }} />
                  <span className="flex-1 text-sm truncate"
                    style={{ color: active ? 'var(--glc-blue-dark)' : 'var(--text-secondary)', fontWeight: active ? 600 : 400 }}>
                    {domain.name}
                  </span>
                  <ScoreBar score={domain.score} />
                </Link>
              );
            })}
          </nav>

          <div className="p-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <Link
              to="/strategy"
              className="flex items-center justify-between text-xs font-medium px-3 py-2 rounded-md w-full transition-colors"
              style={{
                backgroundColor: 'var(--glc-orange-xlight)',
                color: 'var(--glc-orange)',
                textDecoration: 'none',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <span>Open Strategy Lab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </aside>

        {/* ── Domain content ─────────────────────── */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-canvas)' }}>
          <div className="max-w-3xl mx-auto px-7 py-6 space-y-6">
            <motion.div key={activeDomain.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>

              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, var(--glc-blue) 0%, var(--glc-blue-dark) 100%)',
                      borderRadius: 'var(--radius-lg)',
                    }}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {activeDomain.name}
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Phase {idx} · {activeDomain.issues.length} issue{activeDomain.issues.length !== 1 ? 's' : ''} · {activeDomain.quickWins.length} quick wins
                    </p>
                  </div>
                </div>
                <ScoreBadge score={activeDomain.score} showLabel size="md" />
              </div>

              <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', maxWidth: 640 }}>
                {activeDomain.executiveSummary}
              </p>

              {/* Investment */}
              <div
                className="grid grid-cols-3 rounded-lg overflow-hidden mt-4"
                style={{ border: '1px solid var(--border-subtle)' }}
              >
                {[
                  { label: 'Immediate',  val: activeDomain.estimatedInvestment.immediate  },
                  { label: 'Short-Term', val: activeDomain.estimatedInvestment.shortTerm  },
                  { label: 'Long-Term',  val: activeDomain.estimatedInvestment.longTerm   },
                ].map(({ label, val }, i) => (
                  <div
                    key={label}
                    className="px-5 py-3"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderRight: i < 2 ? '1px solid var(--border-subtle)' : 'none',
                    }}
                  >
                    <SectionLabel>{label}</SectionLabel>
                    <div className="font-mono font-semibold text-sm mt-1" style={{ color: 'var(--text-primary)' }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* What's working */}
              <section>
                <div className="flex items-center gap-2 mb-3 mt-6">
                  <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--glc-green)' }} />
                  <SectionLabel>What's Working Well</SectionLabel>
                </div>
                <div className="glc-card overflow-hidden">
                  {activeDomain.strengths.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 px-5 py-2.5"
                      style={{ borderBottom: i < activeDomain.strengths.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                    >
                      <div className="w-1 h-1 rounded-full flex-shrink-0 mt-2" style={{ backgroundColor: 'var(--glc-green)' }} />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 'var(--leading-normal)' }}>{s}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Issues */}
              {activeDomain.issues.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" style={{ color: 'var(--score-2)' }} />
                      <SectionLabel>Issues Found</SectionLabel>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {activeDomain.issues.length} issue{activeDomain.issues.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="glc-card overflow-hidden">
                    <div
                      className="grid px-5 py-2 text-xs font-semibold"
                      style={{
                        gridTemplateColumns: '1fr 90px 110px',
                        color: 'var(--text-tertiary)',
                        backgroundColor: 'var(--bg-canvas)',
                        borderBottom: '1px solid var(--border-subtle)',
                        letterSpacing: 'var(--tracking-wider)',
                        textTransform: 'uppercase',
                      }}
                    >
                      <span>Issue</span><span>Severity</span><span>Quick Win</span>
                    </div>
                    {activeDomain.issues.map((issue, i) => (
                      <div
                        key={issue.id}
                        className="grid items-start gap-4 px-5 py-3.5 text-sm"
                        style={{
                          gridTemplateColumns: '1fr 90px 110px',
                          borderBottom: i < activeDomain.issues.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                        }}
                      >
                        <div>
                          <div className="font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>{issue.title}</div>
                          <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{issue.description}</div>
                          <div className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            <span className="font-medium">Impact:</span> {issue.impact}
                          </div>
                        </div>
                        <SevBadge sev={issue.severity} />
                        {issue.severity === 'low' || issue.severity === 'medium' ? <QuickWinTag /> : <span />}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Recommendations */}
              {activeDomain.recommendations.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4" style={{ color: 'var(--glc-orange)' }} />
                    <SectionLabel>Recommendations</SectionLabel>
                  </div>
                  <div className="space-y-2">
                    {activeDomain.recommendations.map(rec => <RecCard key={rec.id} rec={rec} />)}
                  </div>
                </section>
              )}

              {/* Quick Wins */}
              {activeDomain.quickWins.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4" style={{ color: 'var(--glc-orange)' }} />
                    <SectionLabel>Quick Wins</SectionLabel>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {activeDomain.quickWins.map(qw => (
                      <div
                        key={qw.id}
                        className="p-4 rounded-lg"
                        style={{
                          border: '1px solid var(--glc-orange-light)',
                          backgroundColor: 'var(--glc-orange-xlight)',
                          borderRadius: 'var(--radius-lg)',
                        }}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <Zap className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--glc-orange)' }} />
                          <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{qw.title}</h4>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{qw.description}</p>
                        <div className="mt-2 flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{qw.timeframe}</span>
                          <span>Effort: {qw.effort}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Nav */}
              <div className="flex items-center justify-between pt-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                {idx > 0 ? (
                  <Link
                    to={`/audit/${auditDomains[idx - 1].id}`}
                    className="text-sm flex items-center gap-1"
                    style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                  >
                    ← {auditDomains[idx - 1].name}
                  </Link>
                ) : <span />}
                {idx < auditDomains.length - 1 ? (
                  <Link
                    to={`/audit/${auditDomains[idx + 1].id}`}
                    className="text-sm flex items-center gap-1 font-medium"
                    style={{ color: 'var(--glc-blue)', textDecoration: 'none' }}
                  >
                    {auditDomains[idx + 1].name}<ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <Link to="/reports" className="glc-btn-primary" style={{ textDecoration: 'none' }}>
                    View Full Report <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
