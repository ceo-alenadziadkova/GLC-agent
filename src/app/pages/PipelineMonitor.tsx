import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  MagnifyingGlass, HardDrives, Shield, Globe, Cursor, Target, Lightning, MapTrifold,
  CheckCircle, Clock, WarningCircle, Play, Star, CaretRight,
  ArrowsClockwise, Terminal, ArrowRight
} from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { StatusPill } from '../components/glc/StatusPill';
import { ScoreBadge } from '../components/glc/ScoreBadge';
import { SectionLabel } from '../components/glc/SectionLabel';
import { ReviewPointModal } from '../components/glc/ReviewPointModal';
import { usePipeline } from '../hooks/usePipeline';
import { useAudit } from '../hooks/useAudit';
import type { PipelineEvent } from '../data/auditTypes';

type PhSt = 'completed' | 'running' | 'pending' | 'review' | 'skipped';

const PHASE_META = [
  { id: 0, name: 'Recon',              icon: MagnifyingGlass, wing: 'recon'    as const, domainKey: null },
  { id: 1, name: 'Tech Infrastructure',icon: HardDrives,      wing: 'auto'     as const, domainKey: 'tech_infrastructure' },
  { id: 2, name: 'Security',           icon: Shield,          wing: 'auto'     as const, domainKey: 'security_compliance' },
  { id: 3, name: 'SEO & Digital',      icon: Globe,           wing: 'auto'     as const, domainKey: 'seo_digital' },
  { id: 4, name: 'UX & Conversion',    icon: Cursor,          wing: 'auto'     as const, domainKey: 'ux_conversion' },
  { id: 5, name: 'Marketing & UTP',    icon: Target,          wing: 'analytic' as const, domainKey: 'marketing_utp' },
  { id: 6, name: 'Automation',         icon: Lightning,       wing: 'analytic' as const, domainKey: 'automation_processes' },
  { id: 7, name: 'Strategy & Roadmap', icon: MapTrifold,      wing: 'strategy' as const, domainKey: null },
];

const REVIEW_AFTER_PHASES_FULL = [0, 4, 7];
const REVIEW_AFTER_PHASES_EXPRESS = [0, 4];
const EXPRESS_MAX_PHASE = 4;

function getPhaseStatus(phaseId: number, currentPhase: number, auditStatus: string, reviews: Array<{ after_phase: number; status: string }>, isExpress: boolean): PhSt {
  if (isExpress && phaseId > EXPRESS_MAX_PHASE) return 'skipped';
  if (auditStatus === 'completed') return 'completed';
  if (auditStatus === 'failed') {
    if (phaseId < currentPhase) return 'completed';
    if (phaseId === currentPhase) return 'review'; // show as error state
    return 'pending';
  }

  if (phaseId < currentPhase) return 'completed';
  if (phaseId === currentPhase) {
    // Check if this phase's review is pending
    const review = reviews.find(r => r.after_phase === phaseId);
    if (review && review.status === 'pending') return 'review';
    return 'running';
  }
  return 'pending';
}

interface PhaseView {
  id: number; name: string; label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  status: PhSt; score: number | null;
  wing: 'recon' | 'auto' | 'analytic' | 'strategy';
  log: string[];
  skipped: boolean;
}

function PhCard({ ph, active, onSel }: { ph: PhaseView; active: boolean; onSel: () => void }) {
  const I = ph.icon;
  const stIcon = {
    completed: <CheckCircle      className="w-3.5 h-3.5" style={{ color: 'var(--glc-green)' }} />,
    running:   <ArrowsClockwise className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--glc-blue)' }} />,
    pending:   <Clock           className="w-3.5 h-3.5" style={{ color: 'var(--text-quaternary)' }} />,
    review:    <WarningCircle   className="w-3.5 h-3.5" style={{ color: 'var(--score-3)' }} />,
    skipped:   <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-quaternary)', letterSpacing: '0.05em' }}>SKIP</span>,
  }[ph.status];

  const accentColor = {
    completed: 'var(--glc-green)',
    running:   'var(--glc-blue)',
    pending:   'var(--border-default)',
    review:    'var(--score-3)',
    skipped:   'var(--border-subtle)',
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
        opacity: ph.status === 'pending' ? 0.5 : ph.status === 'skipped' ? 0.35 : 1,
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
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function RevBanner({ review, label, onOpenModal }: { review: { status: string }; label: string; onOpenModal: () => void }) {
  const done = review.status === 'approved';
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
        <span className="text-xs font-bold block" style={{ color, fontFamily: 'var(--font-display)' }}>{label}</span>
        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {done ? 'Approved' : 'Waiting for approval'}
        </p>
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
  const { id } = useParams<{ id: string }>();
  const { state: pipelineState, loading: pipeLoading, error: pipeError, startPipeline, runNextPhase, approveReview } = usePipeline(id);
  const { audit, loading: auditLoading } = useAudit(id);

  const [sel, setSel] = useState(0);
  const [modalReview, setModalReview] = useState<{ afterPhase: number; label: string } | null>(null);

  const isExpress = audit?.meta.product_mode === 'express';
  const reviewAfterPhases = isExpress ? REVIEW_AFTER_PHASES_EXPRESS : REVIEW_AFTER_PHASES_FULL;

  // Build phase views from pipeline state
  const phases: PhaseView[] = useMemo(() => {
    if (!pipelineState || !audit) {
      return PHASE_META.map(pm => ({
        id: pm.id,
        name: pm.name,
        label: `Phase ${pm.id}`,
        icon: pm.icon,
        status: (isExpress && pm.id > EXPRESS_MAX_PHASE ? 'skipped' : 'pending') as PhSt,
        score: null,
        wing: pm.wing,
        log: [],
        skipped: isExpress && pm.id > EXPRESS_MAX_PHASE,
      }));
    }

    const reviews = pipelineState.reviews || [];
    const events = pipelineState.events || [];

    return PHASE_META.map(pm => {
      const status = getPhaseStatus(pm.id, pipelineState.current_phase, pipelineState.status, reviews, isExpress);
      const phaseEvents = events.filter((e: PipelineEvent) => e.phase === pm.id);
      const log = phaseEvents
        .filter((e: PipelineEvent) => e.message)
        .map((e: PipelineEvent) => {
          const prefix = e.event_type === 'completed' ? '✓' : e.event_type === 'error' ? '✗' : '⠋';
          return `${prefix} ${e.message}`;
        });

      // Get score from domain data
      let score: number | null = null;
      if (pm.domainKey && audit.domains[pm.domainKey]) {
        score = audit.domains[pm.domainKey]!.score;
      }

      return {
        id: pm.id,
        name: pm.name,
        label: `Phase ${pm.id}`,
        icon: pm.icon,
        status,
        score,
        wing: pm.wing,
        log,
        skipped: status === 'skipped',
      };
    });
  }, [pipelineState, audit, isExpress]);

  const reviews = useMemo(() => {
    if (!pipelineState) return [];
    return pipelineState.reviews || [];
  }, [pipelineState]);

  const getReviewForPhase = (afterPhase: number) =>
    reviews.find(r => r.after_phase === afterPhase) || { status: 'pending' };

  const ph         = phases.find(p => p.id === sel) ?? phases[0];
  const activePhases = phases.filter(p => !p.skipped);
  const done       = activePhases.filter(p => p.status === 'completed').length;
  const pct        = Math.round((done / activePhases.length) * 100);
  const I    = ph.icon;

  const companyName = audit?.meta.company_name || audit?.meta.company_url || 'Loading...';

  async function handleApprove(_id: number, consultantNotes: string, interviewNotes: string) {
    if (!modalReview) return;
    await approveReview(modalReview.afterPhase, consultantNotes || undefined, interviewNotes || undefined);
    setModalReview(null);
  }

  if (pipeLoading && !pipelineState) {
    return (
      <AppShell title="Pipeline Monitor" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <ArrowsClockwise className="w-6 h-6 animate-spin" style={{ color: 'var(--glc-blue)' }} />
        </div>
      </AppShell>
    );
  }

  const auditStatus = pipelineState?.status || 'created';
  const isCreated = auditStatus === 'created';

  return (
    <AppShell
      title="Pipeline Monitor"
      subtitle={`${companyName} · Audit #${id?.slice(0, 8) ?? ''}`}
      actions={
        <div className="flex items-center gap-3">
          {isExpress && (
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: 'rgba(28,189,255,0.10)',
                color: 'var(--glc-blue)',
                border: '1px solid rgba(28,189,255,0.25)',
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.04em',
              }}
            >
              Express
            </span>
          )}
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
          <StatusPill status={auditStatus === 'completed' ? 'completed' : auditStatus === 'failed' ? 'review' : 'running'} pulse={auditStatus !== 'completed' && auditStatus !== 'failed'} />
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

          <PhCard ph={phases[0]} active={sel === 0} onSel={() => setSel(0)} />
          <RevBanner
            review={getReviewForPhase(0)}
            label="Review Point #1"
            onOpenModal={() => setModalReview({ afterPhase: 0, label: 'Review Point #1' })}
          />

          <div className="px-1 pt-2 pb-1"><SectionLabel>Auto Wing</SectionLabel></div>
          {phases.filter(p => p.wing === 'auto').map(p => (
            <PhCard key={p.id} ph={p} active={sel === p.id} onSel={() => setSel(p.id)} />
          ))}

          <RevBanner
            review={getReviewForPhase(4)}
            label={isExpress ? 'Review Point #2 (Final)' : 'Review Point #2'}
            onOpenModal={() => setModalReview({ afterPhase: 4, label: isExpress ? 'Review Point #2 (Final)' : 'Review Point #2' })}
          />

          <div className="px-1 pt-2 pb-1" style={{ opacity: isExpress ? 0.4 : 1 }}>
            <SectionLabel>Analytic Wing</SectionLabel>
          </div>
          {phases.filter(p => p.wing === 'analytic').map(p => (
            <PhCard key={p.id} ph={p} active={sel === p.id} onSel={() => !p.skipped && setSel(p.id)} />
          ))}

          <div className="px-1 pt-2 pb-1" style={{ opacity: isExpress ? 0.4 : 1 }}>
            <SectionLabel>Synthesis</SectionLabel>
          </div>
          <PhCard ph={phases[7]} active={sel === 7} onSel={() => !phases[7].skipped && setSel(7)} />

          {!isExpress && (
            <RevBanner
              review={getReviewForPhase(7)}
              label="Review Point #3"
              onOpenModal={() => setModalReview({ afterPhase: 7, label: 'Review Point #3' })}
            />
          )}
        </aside>

        {/* ── Phase detail ─────────────────────────── */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-canvas)' }}>
          <div className="max-w-2xl mx-auto px-7 py-6">
            {/* Start pipeline CTA */}
            {isCreated && (
              <div className="glc-card p-8 text-center mb-6" style={{ borderRadius: 'var(--radius-xl)' }}>
                <Play className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--glc-blue)' }} />
                <h3
                  className="font-semibold mb-2"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}
                >
                  Ready to start
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
                  {isExpress
                    ? 'This will begin the Express audit (5 phases: Recon + 4 domains). Estimated cost: ~$0.30 in API credits.'
                    : 'This will begin the full 8-phase audit pipeline. Estimated cost: ~$0.50 in API credits.'}
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startPipeline}
                  className="glc-btn-primary mx-auto"
                >
                  <Play className="w-4 h-4" /> Start Pipeline
                </motion.button>
              </div>
            )}

            {pipeError && (
              <div
                className="rounded-xl p-4 mb-4"
                style={{ backgroundColor: 'var(--score-1-bg)', border: '1px solid var(--score-1-border)', color: 'var(--score-1)' }}
              >
                <p className="text-sm font-medium">Error: {pipeError}</p>
              </div>
            )}

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
                      <ArrowsClockwise className="w-4 h-4 animate-spin" style={{ color: 'var(--glc-blue)' }} />
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
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3">
                  {ph.status === 'completed' && id && (
                    <Link
                      to={`/audit/${id}`}
                      className="glc-btn-secondary"
                      style={{ textDecoration: 'none' }}
                    >
                      View in Workspace <CaretRight className="w-4 h-4" />
                    </Link>
                  )}
                  {ph.status === 'review' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => runNextPhase()}
                      className="glc-btn-primary"
                    >
                      <Play className="w-4 h-4" /> Continue Pipeline
                    </motion.button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Token usage */}
            {pipelineState && (
              <div className="mt-6 flex items-center gap-4 text-xs" style={{ color: 'var(--text-quaternary)' }}>
                <span>Tokens used: <strong className="font-mono">{pipelineState.tokens_used.toLocaleString()}</strong> / {pipelineState.token_budget.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <ReviewPointModal
        open={modalReview !== null}
        reviewPoint={modalReview ? { id: modalReview.afterPhase, label: modalReview.label, note: 'Add your observations before continuing', after: modalReview.afterPhase } : null}
        onClose={() => setModalReview(null)}
        onApprove={handleApprove}
      />
    </AppShell>
  );
}
