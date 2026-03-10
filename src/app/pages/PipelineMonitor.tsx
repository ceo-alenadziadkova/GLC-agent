import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Server, Shield, Globe, MousePointer, Target, Zap, Map,
  CheckCircle2, Clock, AlertCircle, Play, Star, ChevronRight,
  RefreshCw, Terminal, ArrowRight
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { StatusPill } from '../components/glc/StatusPill';
import { ScoreBadge } from '../components/glc/ScoreBadge';
import { SectionLabel } from '../components/glc/SectionLabel';
import { ReviewPointModal } from '../components/glc/ReviewPointModal';

type PhSt = 'completed' | 'running' | 'pending' | 'review';

interface Phase {
  id: number; name: string; label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  status: PhSt; score: number | null;
  wing: 'recon' | 'auto' | 'analytic' | 'strategy';
  duration?: string; log?: string[];
}

const PHASES: Phase[] = [
  { id: 0, name: 'Recon',             label: 'Phase 0', icon: Search,       status: 'completed', score: null, wing: 'recon',    duration: '4m 12s', log: ['✓ Crawled 15 pages', '✓ Stack: WordPress 5.8, Cloudflare, GA4', '✓ Competitors identified: 3', '✓ Interview questions: 12'] },
  { id: 1, name: 'Tech Infrastructure',label: 'Phase 1', icon: Server,       status: 'completed', score: 3,    wing: 'auto',     duration: '6m 30s', log: ['✓ Lighthouse: 58/100', '✓ WordPress 5.8 — EOL, 12 CVEs', '✓ No CDN for static assets', '✓ Mobile: 43/100'] },
  { id: 2, name: 'Security',           label: 'Phase 2', icon: Shield,       status: 'completed', score: 2,    wing: 'auto',     duration: '3m 55s', log: ['✓ HTTPS: OK', '✗ No CSP header', '✗ No GDPR consent banner', '✗ Verifactu: not implemented'] },
  { id: 3, name: 'SEO & Digital',      label: 'Phase 3', icon: Globe,        status: 'completed', score: 3,    wing: 'auto',     duration: '5m 10s', log: ['✓ robots.txt found', '✓ sitemap.xml found', '✗ No JSON-LD data', '✗ hreflang missing'] },
  { id: 4, name: 'UX & Conversion',    label: 'Phase 4', icon: MousePointer, status: 'completed', score: 4,    wing: 'auto',     duration: '7m 02s', log: ['✓ Mobile responsive', '✓ Clear CTA structure', '✗ Booking form: 9 fields', '✗ No exit-intent'] },
  { id: 5, name: 'Marketing & UТП',   label: 'Phase 5', icon: Target,       status: 'running',   score: null, wing: 'analytic',             log: ['⠋ Analyzing brand positioning...', '⠋ Comparing vs competitors...'] },
  { id: 6, name: 'Automation',         label: 'Phase 6', icon: Zap,          status: 'pending',   score: null, wing: 'analytic' },
  { id: 7, name: 'Strategy & Roadmap', label: 'Phase 7', icon: Map,          status: 'pending',   score: null, wing: 'strategy' },
];

const REVIEWS_INIT = [
  { id: 1, after: 0, status: 'completed' as PhSt, label: 'Review Point #1', note: 'Brief added. Interview notes uploaded.' },
  { id: 2, after: 4, status: 'pending'   as PhSt, label: 'Review Point #2', note: 'Waiting for auto-wing completion.' },
];

function PhCard({ ph, active, onSel }: { ph: Phase; active: boolean; onSel: () => void }) {
  const I = ph.icon;
  const stIcon = {
    completed: <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--glc-green)' }} />,
    running:   <RefreshCw    className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--glc-blue)' }} />,
    pending:   <Clock        className="w-3.5 h-3.5" style={{ color: 'var(--text-quaternary)' }} />,
    review:    <AlertCircle  className="w-3.5 h-3.5" style={{ color: 'var(--score-3)' }} />,
  }[ph.status];

  const accentColor = {
    completed: 'var(--glc-green)',
    running:   'var(--glc-blue)',
    pending:   'var(--border-default)',
    review:    'var(--score-3)',
  }[ph.status];

  return (
    <motion.button
      onClick={onSel}
      whileHover={{ x: 1 }}
      transition={{ duration: 0.15 }}
      className="w-full text-left p-3 rounded-xl"
      style={{
        backgroundColor: active ? 'var(--glc-blue-xlight)' : 'var(--bg-surface)',
        border: `1px solid ${active ? 'rgba(28,189,255,0.30)' : 'var(--border-subtle)'}`,
        borderLeft: `3px solid ${active ? 'var(--glc-blue)' : accentColor}`,
        borderRadius: 'var(--radius-lg)',
        opacity: ph.status === 'pending' ? 0.5 : 1,
        boxShadow: active ? '0 0 0 3px rgba(28,189,255,0.10)' : 'var(--shadow-xs)',
        transition: 'all var(--ease-fast)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: active
              ? 'var(--gradient-brand)'
              : ph.status === 'completed'
              ? 'var(--glc-green-xlight)'
              : 'var(--bg-inset)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <I
            className="w-3.5 h-3.5"
            style={{
              color: active
                ? '#fff'
                : ph.status === 'completed'
                ? 'var(--glc-green-dark)'
                : 'var(--text-tertiary)',
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span
              className="text-xs truncate"
              style={{
                color: active ? 'var(--glc-blue-deeper)' : 'var(--text-secondary)',
                fontWeight: active ? 600 : 400,
                fontFamily: active ? 'var(--font-display)' : 'var(--font-sans)',
              }}
            >
              {ph.name}
            </span>
            {stIcon}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {ph.score !== null && <ScoreBadge score={ph.score} size="sm" />}
            {ph.duration && (
              <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-quaternary)' }}>
                {ph.duration}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function RevBanner({ rv, onOpenModal }: { rv: typeof REVIEWS_INIT[0]; onOpenModal: () => void }) {
  const done = rv.status === 'completed';
  const color  = done ? 'var(--glc-green)'  : 'var(--score-3)';
  const bg     = done ? 'var(--glc-green-xlight)' : 'var(--score-3-bg)';
  const border = done ? 'rgba(14,207,130,0.25)'   : 'rgba(234,179,8,0.25)';

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
      style={{
        backgroundColor: bg,
        border: `1px solid ${border}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <Star className="w-3.5 h-3.5 flex-shrink-0" style={{ color, fill: color, stroke: 'none' }} />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-bold block" style={{ color, fontFamily: 'var(--font-display)' }}>{rv.label}</span>
        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>{rv.note}</p>
      </div>
      {!done && (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onOpenModal}
          className="text-xs font-bold px-2.5 py-1.5 rounded-lg flex-shrink-0 flex items-center gap-1"
          style={{
            background: 'var(--gradient-accent)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(242,79,29,0.28)',
            fontSize: '11px',
          }}
        >
          Approve <ArrowRight className="w-3 h-3" />
        </motion.button>
      )}
    </div>
  );
}

export function PipelineMonitor() {
  const [sel,     setSel]     = useState(5);
  const [reviews, setReviews] = useState(REVIEWS_INIT);
  const [modalRv, setModalRv] = useState<typeof REVIEWS_INIT[0] | null>(null);

  const ph   = PHASES.find(p => p.id === sel) ?? PHASES[0];
  const done = PHASES.filter(p => p.status === 'completed').length;
  const pct  = Math.round((done / PHASES.length) * 100);
  const I    = ph.icon;

  function handleApprove(id: number) {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status: 'completed' as PhSt } : r));
    setModalRv(null);
  }

  return (
    <AppShell
      title="Pipeline Monitor"
      subtitle="Hotel XYZ · Audit #glc-2026-03-09"
      actions={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-28 rounded-full overflow-hidden" style={{ height: 4, backgroundColor: 'var(--border-subtle)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: 'var(--glc-green)', boxShadow: '0 0 6px var(--glc-green)' }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <span className="text-xs font-mono font-bold tabular-nums" style={{ color: 'var(--glc-green)' }}>{pct}%</span>
          </div>
          <StatusPill status="running" pulse />
        </div>
      }
    >
      <div className="flex" style={{ height: 'calc(100vh - 56px)' }}>

        {/* ── Phase sidebar ────────────────────────── */}
        <aside
          className="w-[252px] flex-shrink-0 overflow-y-auto flex flex-col gap-1.5 p-3"
          style={{ borderRight: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
        >
          <div className="px-1 pb-1.5"><SectionLabel>Phases</SectionLabel></div>

          <PhCard ph={PHASES[0]} active={sel === 0} onSel={() => setSel(0)} />
          <RevBanner rv={reviews[0]} onOpenModal={() => setModalRv(reviews[0])} />

          <div className="px-1 pt-2 pb-1"><SectionLabel>Auto Wing</SectionLabel></div>
          {PHASES.filter(p => p.wing === 'auto').map(p => (
            <PhCard key={p.id} ph={p} active={sel === p.id} onSel={() => setSel(p.id)} />
          ))}

          <RevBanner rv={reviews[1]} onOpenModal={() => setModalRv(reviews[1])} />

          <div className="px-1 pt-2 pb-1"><SectionLabel>Analytic Wing</SectionLabel></div>
          {PHASES.filter(p => p.wing === 'analytic').map(p => (
            <PhCard key={p.id} ph={p} active={sel === p.id} onSel={() => setSel(p.id)} />
          ))}

          <div className="px-1 pt-2 pb-1"><SectionLabel>Synthesis</SectionLabel></div>
          <PhCard ph={PHASES[7]} active={sel === 7} onSel={() => setSel(7)} />
        </aside>

        {/* ── Phase detail ─────────────────────────── */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-canvas)' }}>
          <div className="max-w-2xl mx-auto px-7 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={ph.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5"
              >
                {/* Header */}
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: ph.status === 'completed'
                        ? 'var(--gradient-success)'
                        : ph.status === 'running'
                        ? 'var(--gradient-brand)'
                        : 'var(--bg-muted)',
                      boxShadow: ph.status === 'running'
                        ? '0 4px 16px rgba(28,189,255,0.30)'
                        : ph.status === 'completed'
                        ? '0 4px 16px rgba(14,207,130,0.25)'
                        : 'none',
                    }}
                  >
                    <I
                      className="w-6 h-6"
                      style={{ color: ph.status === 'pending' ? 'var(--text-tertiary)' : '#fff' }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h2
                        style={{
                          color: 'var(--text-primary)',
                          fontSize: 'var(--text-xl)',
                          fontWeight: 700,
                          fontFamily: 'var(--font-display)',
                          letterSpacing: 'var(--tracking-tight)',
                        }}
                      >
                        {ph.label}: {ph.name}
                      </h2>
                      <StatusPill status={ph.status} pulse={ph.status === 'running'} />
                    </div>
                    <div className="flex items-center gap-3 mt-1.5" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
                      {ph.duration && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />{ph.duration}
                        </span>
                      )}
                      {ph.score !== null && <ScoreBadge score={ph.score} showLabel size="md" />}
                    </div>
                  </div>
                </div>

                {/* Running progress bar */}
                {ph.status === 'running' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl p-4"
                    style={{
                      backgroundColor: 'var(--glc-blue-xlight)',
                      border: '1px solid rgba(28,189,255,0.20)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <RefreshCw className="w-4 h-4 animate-spin" style={{ color: 'var(--glc-blue)' }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--glc-blue-deeper)', fontFamily: 'var(--font-display)' }}>
                        Agent running...
                      </span>
                    </div>
                    <div className="rounded-full overflow-hidden" style={{ height: 4, backgroundColor: 'rgba(28,189,255,0.15)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: 'var(--gradient-brand)', boxShadow: '0 0 8px rgba(28,189,255,0.40)' }}
                        initial={{ width: '20%' }}
                        animate={{ width: '75%' }}
                        transition={{ duration: 4, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' }}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Pending placeholder */}
                {ph.status === 'pending' && (
                  <div
                    className="glc-card p-10 text-center"
                    style={{ borderStyle: 'dashed', borderRadius: 'var(--radius-xl)' }}
                  >
                    <Clock className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-quaternary)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>Waiting for previous phases</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-quaternary)' }}>This phase will start automatically</p>
                  </div>
                )}

                {/* Agent log */}
                {ph.log && ph.log.length > 0 && (
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-md)' }}>
                    <div
                      className="flex items-center gap-2 px-4 py-2.5"
                      style={{ background: 'var(--gradient-ink)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--glc-green)' }} />
                      </div>
                      <Terminal className="w-3.5 h-3.5 ml-2" style={{ color: 'rgba(255,255,255,0.35)' }} />
                      <span className="glc-label" style={{ color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em' }}>
                        Agent Log · {ph.name}
                      </span>
                    </div>
                    <div
                      className="p-4 space-y-2"
                      style={{ backgroundColor: '#0A0F1E', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                    >
                      {ph.log.map((line, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.07, duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                          style={{
                            color: line.startsWith('✓')
                              ? '#34D399'
                              : line.startsWith('✗')
                              ? '#F87171'
                              : 'rgba(148,163,184,0.80)',
                            lineHeight: 1.6,
                          }}
                        >
                          {line}
                        </motion.div>
                      ))}
                      {ph.status === 'running' && (
                        <motion.span
                          animate={{ opacity: [1, 0] }}
                          transition={{ duration: 0.65, repeat: Infinity }}
                          style={{ color: 'var(--glc-blue)', display: 'inline-block' }}
                        >
                          ▌
                        </motion.span>
                      )}
                    </div>
                  </div>
                )}

                {/* Score summary */}
                {ph.status === 'completed' && ph.score !== null && (
                  <div className="glc-card p-5" style={{ borderRadius: 'var(--radius-xl)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <SectionLabel>Domain Score</SectionLabel>
                      <ScoreBadge score={ph.score} showLabel size="lg" />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      {[
                        { l: 'Strengths', v: ph.id + 2, color: 'var(--glc-green)'  },
                        { l: 'Issues',    v: ph.id + 1, color: 'var(--score-1)'    },
                        { l: 'Quick Wins',v: ph.id > 2 ? 1 : 2, color: 'var(--glc-orange)' },
                      ].map(({ l, v, color }) => (
                        <div key={l}>
                          <div
                            className="text-2xl font-bold tabular-nums"
                            style={{ color, fontFamily: 'var(--font-display)', letterSpacing: 'var(--tracking-tight)' }}
                          >
                            {v}
                          </div>
                          <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3">
                  {ph.status === 'completed' && (
                    <>
                      <button className="glc-btn-primary">
                        <CheckCircle2 className="w-4 h-4" /> Review & Approve
                      </button>
                      <button className="glc-btn-secondary">
                        View in Workspace <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {ph.status === 'pending' && (
                    <button className="glc-btn-secondary" disabled style={{ opacity: 0.4, cursor: 'not-allowed' }}>
                      <Play className="w-4 h-4" /> Run Phase
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <ReviewPointModal
        open={modalRv !== null}
        reviewPoint={modalRv}
        onClose={() => setModalRv(null)}
        onApprove={(id) => handleApprove(id)}
      />
    </AppShell>
  );
}
