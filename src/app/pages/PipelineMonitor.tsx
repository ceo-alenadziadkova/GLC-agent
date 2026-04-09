import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, Link, Navigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  WarningCircle,
  Play,
  CaretRight,
  ArrowsClockwise,
  Terminal,
  Check,
  X,
  CircleNotch,
} from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { StatusPill } from '../components/glc/StatusPill';
import { ScoreBadge } from '../components/glc/ScoreBadge';
import { SectionLabel } from '../components/glc/SectionLabel';
import { ReviewPointModal } from '../components/glc/ReviewPointModal';
import { usePipeline } from '../hooks/usePipeline';
import { useAudit } from '../hooks/useAudit';
import { useProfile } from '../hooks/useProfile';
import { api } from '../data/apiService';
import { clientCanViewPortalPipeline } from '../lib/client-portal-pipeline-access';
import type { PipelineEvent, QualityGateReport } from '../data/auditTypes';
import { formatAuditWebsiteDisplay } from '../data/no-public-website';
import {
  ANALYTIC_WING_IDS,
  AUTO_WING_IDS,
  EXPRESS_MAX_PHASE,
  getPhaseStatus,
  type PhSt,
} from '../lib/pipeline-monitor-helpers';
import {
  ParallelWingBanner,
  PHASE_META,
  PhCard,
  RevBanner,
  type LogEntry,
  type PhaseView,
} from './pipeline-monitor';

export function PipelineMonitor() {
  const { id } = useParams<{ id: string }>();
  const { state: pipelineState, loading: pipeLoading, error: pipeError, startPipeline, runNextPhase, approveReview } = usePipeline(id);
  const { audit, loading: auditLoading } = useAudit(id);
  const { isClient } = useProfile();
  const [clientPortalOk, setClientPortalOk] = useState<boolean | 'pending'>(() => (isClient ? 'pending' : true));
  /** Avoid flashing full-page loader when the same audit re-fetches (e.g. object identity changes). */
  const portalGateKeyRef = useRef<string | null>(null);
  const [sel, setSel] = useState(0);
  const [modalReview, setModalReview] = useState<{ afterPhase: number; label: string } | null>(null);

  useEffect(() => {
    if (!isClient) {
      setClientPortalOk(true);
      return;
    }
    if (!id) {
      setClientPortalOk(false);
      return;
    }
    // Only gate on fetch when we have no audit snapshot yet; refetch keeps prior audit in cache.
    if (auditLoading && !audit) {
      setClientPortalOk('pending');
      return;
    }
    if (!audit?.meta) {
      setClientPortalOk(audit ? 'pending' : false);
      return;
    }
    const meta = audit.meta;
    const gateKey = `${id}:${meta.status}:${meta.product_mode ?? ''}`;
    const sameGate = portalGateKeyRef.current === gateKey;
    portalGateKeyRef.current = gateKey;

    let cancelled = false;
    if (!sameGate) {
      setClientPortalOk('pending');
    }
    void (async () => {
      try {
        if (meta.status !== 'created') {
          if (!cancelled) {
            setClientPortalOk(clientCanViewPortalPipeline({ auditMeta: meta, brief: {} }));
          }
          return;
        }
        const d = await api.getBrief(id);
        if (cancelled) return;
        const pm = d.product_mode === 'express' ? 'express' : 'full';
        setClientPortalOk(
          clientCanViewPortalPipeline({
            auditMeta: meta,
            brief: {
              product_mode: pm,
              gates: {
                canStartExpress: Boolean(d.gates?.canStartExpress),
                canStartFull: Boolean(d.gates?.canStartFull),
              },
            },
          }),
        );
      } catch {
        if (!cancelled) setClientPortalOk(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isClient, id, audit, auditLoading]);

  const isExpress = audit?.meta.product_mode === 'express';
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
      // Domain-level status for parallel phase detection
      const domainData = pm.domainKey ? (audit.domains as Record<string, { status: string; score: number } | null>)[pm.domainKey] : null;
      const domainStatus = domainData?.status ?? null;

      const status = getPhaseStatus(pm.id, pipelineState.current_phase, pipelineState.status, reviews, isExpress, domainStatus);
      const phaseEvents = events.filter((e: PipelineEvent) => e.phase === pm.id);
      const log = phaseEvents
        .filter((e: PipelineEvent) => e.message)
        .map((e: PipelineEvent): LogEntry => ({
          eventType: e.event_type,
          text: e.message ?? '',
        }));

      const score: number | null = domainData?.score ?? null;

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

  const getQualityGateForPhase = (phase: number): QualityGateReport | null => {
    if (!pipelineState) return null;
    const event = pipelineState.events.find(
      (e: PipelineEvent) => e.phase === phase && e.event_type === 'quality_gate'
    );
    return event ? (event.data as QualityGateReport) : null;
  };

  const ph         = phases.find(p => p.id === sel) ?? phases[0];
  const activePhases = phases.filter(p => !p.skipped);
  const done       = activePhases.filter(p => p.status === 'completed').length;
  const pct        = Math.round((done / activePhases.length) * 100);
  const I    = ph.icon;

  const companyName =
    audit?.meta.company_name
    || formatAuditWebsiteDisplay(audit?.meta.company_url)
    || audit?.meta.company_url
    || 'Loading...';

  const workspacePath = id ? (isClient ? `/portal/audit/${id}` : `/audit/${id}`) : '/';

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

  if (isClient && clientPortalOk === 'pending' && id) {
    return (
      <AppShell title="Pipeline Monitor" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <ArrowsClockwise className="w-6 h-6 animate-spin" style={{ color: 'var(--glc-blue)' }} />
        </div>
      </AppShell>
    );
  }

  if (isClient && clientPortalOk === false && id) {
    return <Navigate to={`/portal/audit/${id}`} replace />;
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
            hasWarnings={!getQualityGateForPhase(0)?.passed && (getQualityGateForPhase(0)?.flags.some(f => f.severity === 'warning') ?? false)}
            canApprove={!isClient}
          />

          {/* Auto wing — 2×2 grid to reflect parallel execution */}
          <div className="px-1 pt-2 pb-1 flex items-center gap-2">
            <SectionLabel>Auto Wing</SectionLabel>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: 'rgba(28,189,255,0.12)',
                color: 'var(--glc-blue)',
                border: '1px solid rgba(28,189,255,0.25)',
                letterSpacing: '0.06em',
                fontFamily: 'var(--font-display)',
              }}
            >
              PARALLEL
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {phases.filter(p => p.wing === 'auto').map(p => (
              <PhCard key={p.id} ph={p} active={sel === p.id} onSel={() => setSel(p.id)} />
            ))}
          </div>

          <RevBanner
            review={getReviewForPhase(4)}
            label={isExpress ? 'Review Point #2 (Final)' : 'Review Point #2'}
            onOpenModal={() => setModalReview({ afterPhase: 4, label: isExpress ? 'Review Point #2 (Final)' : 'Review Point #2' })}
            hasWarnings={!getQualityGateForPhase(4)?.passed && (getQualityGateForPhase(4)?.flags.some(f => f.severity === 'warning') ?? false)}
            canApprove={!isClient}
          />

          {/* Analytic wing — 2-column grid */}
          <div className="px-1 pt-2 pb-1 flex items-center gap-2" style={{ opacity: isExpress ? 0.4 : 1 }}>
            <SectionLabel>Analytic Wing</SectionLabel>
            {!isExpress && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'rgba(28,189,255,0.08)',
                  color: 'var(--glc-blue)',
                  border: '1px solid rgba(28,189,255,0.18)',
                  letterSpacing: '0.06em',
                  fontFamily: 'var(--font-display)',
                }}
              >
                PARALLEL
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5" style={{ opacity: isExpress ? 0.35 : 1 }}>
            {phases.filter(p => p.wing === 'analytic').map(p => (
              <PhCard key={p.id} ph={p} active={sel === p.id} onSel={() => !p.skipped && setSel(p.id)} />
            ))}
          </div>

          <div className="px-1 pt-2 pb-1" style={{ opacity: isExpress ? 0.4 : 1 }}>
            <SectionLabel>Synthesis</SectionLabel>
          </div>
          <PhCard ph={phases[7]} active={sel === 7} onSel={() => !phases[7].skipped && setSel(7)} />

          {!isExpress && (
            <RevBanner
              review={getReviewForPhase(7)}
              label="Review Point #3"
              onOpenModal={() => setModalReview({ afterPhase: 7, label: 'Review Point #3' })}
              hasWarnings={!getQualityGateForPhase(7)?.passed && (getQualityGateForPhase(7)?.flags.some(f => f.severity === 'warning') ?? false)}
              canApprove={!isClient}
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

            {/* Parallel wing banners — shown when wing is actively running */}
            <AnimatePresence>
              {phases.some(p => AUTO_WING_IDS.includes(p.id) && p.status === 'running') && (
                <ParallelWingBanner
                  phases={phases.filter(p => AUTO_WING_IDS.includes(p.id))}
                  wingName="Auto Wing"
                />
              )}
              {phases.some(p => ANALYTIC_WING_IDS.includes(p.id) && p.status === 'running') && (
                <ParallelWingBanner
                  phases={phases.filter(p => ANALYTIC_WING_IDS.includes(p.id))}
                  wingName="Analytic Wing"
                />
              )}
            </AnimatePresence>

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
                      style={{ color: ph.status === 'pending' ? 'var(--text-tertiary)' : 'var(--primary-foreground)' }}
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

                {/* Failed domain — partial failure */}
                {ph.status === 'failed' && (
                  <div
                    className="rounded-xl p-4"
                    style={{
                      backgroundColor: 'rgba(239,68,68,0.06)',
                      border: '1px solid rgba(239,68,68,0.25)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <WarningCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#EF4444' }} />
                      <span className="text-sm font-semibold" style={{ color: '#EF4444', fontFamily: 'var(--font-display)' }}>
                        Domain unavailable
                      </span>
                    </div>
                    <p className="text-xs ml-6" style={{ color: 'var(--text-secondary)' }}>
                      This domain could not be analysed. The pipeline has continued and the Strategy Agent will note this gap explicitly.
                    </p>
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
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--callout-warning-icon)' }} />
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
                      {ph.log.map((entry, i) => {
                        const isOk  = entry.eventType === 'completed' || entry.eventType === 'fact_check';
                        const isErr = entry.eventType === 'error';
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.07, duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                            className="flex items-start gap-1.5"
                            style={{ color: isOk ? '#34D399' : isErr ? '#F87171' : 'rgba(148,163,184,0.80)', lineHeight: 1.6 }}
                          >
                            {isOk
                              ? <Check size={11} weight="bold" style={{ marginTop: 3, flexShrink: 0 }} />
                              : isErr
                              ? <X size={11} weight="bold" style={{ marginTop: 3, flexShrink: 0 }} />
                              : <CircleNotch size={11} style={{ marginTop: 3, flexShrink: 0 }} />}
                            <span>{entry.text}</span>
                          </motion.div>
                        );
                      })}
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
                      to={workspacePath}
                      className="glc-btn-secondary"
                      style={{ textDecoration: 'none' }}
                    >
                      View in Workspace <CaretRight className="w-4 h-4" />
                    </Link>
                  )}
                  {ph.status === 'review' && !isClient && (
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
        open={!isClient && modalReview !== null}
        reviewPoint={modalReview ? { id: modalReview.afterPhase, label: modalReview.label, note: 'Add your observations before continuing', after: modalReview.afterPhase } : null}
        onClose={() => setModalReview(null)}
        onApprove={handleApprove}
        qualityGate={modalReview ? getQualityGateForPhase(modalReview.afterPhase) : null}
      />
    </AppShell>
  );
}
