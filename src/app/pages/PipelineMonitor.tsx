import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Search, Server, Shield, Globe, MousePointer, Target, Zap, Map,
  CheckCircle2, Clock, AlertCircle, Play, Star, ChevronRight,
  RefreshCw, Terminal
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { StatusPill } from '../components/glc/StatusPill';
import { ScoreBadge } from '../components/glc/ScoreBadge';
import { SectionLabel } from '../components/glc/SectionLabel';
import { ReviewPointModal } from '../components/glc/ReviewPointModal';

type PhSt = 'completed' | 'running' | 'pending' | 'review';

interface Phase {
  id: number; name: string; label: string;
  icon: React.ComponentType<{ className?: string }>;
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
  { id: 5, name: 'Marketing & УТП',    label: 'Phase 5', icon: Target,       status: 'running',   score: null, wing: 'analytic',             log: ['⠋ Analyzing brand positioning...', '⠋ Comparing vs competitors...'] },
  { id: 6, name: 'Automation',         label: 'Phase 6', icon: Zap,          status: 'pending',   score: null, wing: 'analytic' },
  { id: 7, name: 'Strategy & Roadmap', label: 'Phase 7', icon: Map,          status: 'pending',   score: null, wing: 'strategy' },
];

const REVIEWS = [
  { id: 1, after: 0, status: 'completed' as PhSt, label: '★ Review Point #1', note: 'Brief added. Interview notes uploaded.' },
  { id: 2, after: 4, status: 'pending'   as PhSt, label: '★ Review Point #2', note: 'Waiting for auto-wing.' },
];

function PhCard({ ph, active, onSel }: { ph: Phase; active: boolean; onSel: () => void }) {
  const I = ph.icon;
  const stIcon = {
    completed: <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--glc-green)' }} />,
    running:   <RefreshCw    className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--glc-blue)' }} />,
    pending:   <Clock        className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />,
    review:    <AlertCircle  className="w-3.5 h-3.5" style={{ color: 'var(--score-3)' }} />,
  }[ph.status];

  const leftColor = {
    completed: 'var(--glc-green)', running: 'var(--glc-blue)',
    pending: 'var(--border-default)', review: 'var(--score-3)',
  }[ph.status];

  return (
    <button
      onClick={onSel}
      className="w-full text-left p-3 rounded-lg transition-all"
      style={{
        backgroundColor: active ? 'var(--glc-blue-xlight)' : 'var(--bg-surface)',
        border: `1px solid ${active ? 'var(--glc-blue)' : leftColor}`,
        borderLeft: `3px solid ${leftColor}`,
        borderRadius: 'var(--radius-lg)',
        opacity: ph.status === 'pending' ? 0.55 : 1,
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
          style={{
            background: active
              ? 'linear-gradient(135deg, var(--glc-blue) 0%, var(--glc-blue-dark) 100%)'
              : 'var(--bg-canvas)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <I className="w-3.5 h-3.5" style={{ color: active ? '#fff' : 'var(--text-tertiary)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs truncate" style={{ color: active ? 'var(--glc-blue-dark)' : 'var(--text-secondary)', fontWeight: active ? 600 : 400 }}>
              {ph.name}
            </span>
            {stIcon}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {ph.score !== null && <ScoreBadge score={ph.score} size="sm" />}
            {ph.duration && <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{ph.duration}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}

function RevBanner({ rv, onOpenModal }: { rv: typeof REVIEWS[0]; onOpenModal: () => void }) {
  const done = rv.status === 'completed';
  const c = done ? 'var(--glc-green)' : 'var(--score-3)';
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
      style={{
        backgroundColor: done ? 'var(--glc-green-xlight)' : 'var(--score-3-bg)',
        border: `1px solid ${c}`,
        borderLeft: `3px solid ${c}`,
        borderRadius: 'var(--radius-md)',
      }}
    >
      <Star className="w-3 h-3 flex-shrink-0" style={{ color: c }} />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold" style={{ color: c }}>{rv.label}</span>
        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{rv.note}</p>
      </div>
      {!done && (
        <button
          onClick={onOpenModal}
          className="text-xs font-semibold px-2 py-1 rounded flex-shrink-0"
          style={{ backgroundColor: 'var(--score-3)', color: '#fff', borderRadius: 'var(--radius-sm)' }}
        >
          Approve
        </button>
      )}
    </div>
  );
}

export function PipelineMonitor() {
  const [sel, setSel] = useState(5);
  const [reviews, setReviews] = useState(REVIEWS);
  const [modalRv, setModalRv] = useState<typeof REVIEWS[0] | null>(null);

  const ph = PHASES.find(p => p.id === sel) ?? PHASES[0];
  const done = PHASES.filter(p => p.status === 'completed').length;
  const pct = Math.round((done / PHASES.length) * 100);
  const I = ph.icon;

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
          <div className="flex items-center gap-2">
            <div className="w-24 rounded-full overflow-hidden" style={{ height: 3, backgroundColor: 'var(--border-subtle)' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: 'var(--glc-green)' }} />
            </div>
            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--glc-green)' }}>{pct}%</span>
          </div>
          <StatusPill status="running" pulse />
        </div>
      }
    >
      <div className="flex" style={{ height: 'calc(100vh - 56px)' }}>
        {/* ── Phase sidebar ─────────────────── */}
        <aside
          className="w-[256px] flex-shrink-0 overflow-y-auto flex flex-col gap-1.5 p-2.5"
          style={{ borderRight: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
        >
          <div className="px-1 pb-1"><SectionLabel>Phases</SectionLabel></div>

          <PhCard ph={PHASES[0]} active={sel === 0} onSel={() => setSel(0)} />
          <RevBanner rv={reviews[0]} onOpenModal={() => setModalRv(reviews[0])} />

          <div className="px-1 pt-1"><SectionLabel>Auto Wing</SectionLabel></div>
          {PHASES.filter(p => p.wing === 'auto').map(p => <PhCard key={p.id} ph={p} active={sel === p.id} onSel={() => setSel(p.id)} />)}

          <RevBanner rv={reviews[1]} onOpenModal={() => setModalRv(reviews[1])} />

          <div className="px-1 pt-1"><SectionLabel>Analytic Wing</SectionLabel></div>
          {PHASES.filter(p => p.wing === 'analytic').map(p => <PhCard key={p.id} ph={p} active={sel === p.id} onSel={() => setSel(p.id)} />)}

          <div className="px-1 pt-1"><SectionLabel>Synthesis</SectionLabel></div>
          <PhCard ph={PHASES[7]} active={sel === 7} onSel={() => setSel(7)} />
        </aside>

        {/* ── Phase detail ───────────────────── */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-canvas)' }}>
          <div className="max-w-2xl mx-auto px-7 py-6">
            <motion.div key={ph.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--glc-blue) 0%, var(--glc-blue-dark) 100%)', borderRadius: 'var(--radius-xl)' }}
                >
                  <I className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{ph.label}: {ph.name}</h2>
                    <StatusPill status={ph.status} pulse={ph.status === 'running'} />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {ph.duration && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{ph.duration}</span>}
                    {ph.score !== null && <ScoreBadge score={ph.score} showLabel size="md" />}
                  </div>
                </div>
              </div>

              {/* Running progress */}
              {ph.status === 'running' && (
                <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--glc-blue-xlight)', border: '1px solid var(--glc-blue-light)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <RefreshCw className="w-4 h-4 animate-spin" style={{ color: 'var(--glc-blue)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--glc-blue-dark)' }}>Agent running...</span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 4, backgroundColor: 'var(--glc-blue-light)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: 'var(--glc-blue)' }}
                      initial={{ width: '25%' }}
                      animate={{ width: '70%' }}
                      transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' }}
                    />
                  </div>
                </div>
              )}

              {/* Pending */}
              {ph.status === 'pending' && (
                <div className="glc-card p-8 text-center">
                  <Clock className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Waiting for previous phase to complete</p>
                </div>
              )}

              {/* Log */}
              {ph.log && ph.log.length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                  <div
                    className="flex items-center gap-2 px-4 py-2.5"
                    style={{ backgroundColor: 'var(--glc-ink)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <Terminal className="w-3.5 h-3.5 text-white opacity-50" />
                    <span className="glc-label text-white opacity-40">Agent Log</span>
                  </div>
                  <div className="p-4 space-y-1.5 font-mono text-xs" style={{ backgroundColor: '#0F172A', borderRadius: '0 0 12px 12px' }}>
                    {ph.log.map((line, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        style={{ color: line.startsWith('✓') ? '#4ADE80' : line.startsWith('✗') ? '#F87171' : '#94A3B8' }}
                      >
                        {line}
                      </motion.div>
                    ))}
                    {ph.status === 'running' && (
                      <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.7, repeat: Infinity }} style={{ color: 'var(--glc-blue)' }}>
                        _
                      </motion.span>
                    )}
                  </div>
                </div>
              )}

              {/* Score summary (completed) */}
              {ph.status === 'completed' && ph.score !== null && (
                <div className="glc-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <SectionLabel>Domain Score</SectionLabel>
                    <ScoreBadge score={ph.score} showLabel size="lg" />
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {[{ l: 'Strengths', v: ph.id + 2 }, { l: 'Issues', v: ph.id + 1 }, { l: 'Quick Wins', v: ph.id > 2 ? 1 : 2 }].map(({ l, v }) => (
                      <div key={l}>
                        <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{v}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{l}</div>
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
                  <button className="glc-btn-secondary" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                    <Play className="w-4 h-4" /> Run Phase
                  </button>
                )}
              </div>
            </motion.div>
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
