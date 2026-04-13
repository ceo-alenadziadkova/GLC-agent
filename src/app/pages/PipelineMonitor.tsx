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
  Info,
} from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { StatusPill } from '../components/glc/StatusPill';
import { ScoreBadge } from '../components/glc/ScoreBadge';
import { SectionLabel } from '../components/glc/SectionLabel';
import { ReviewPointModal } from '../components/glc/ReviewPointModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { usePipeline } from '../hooks/usePipeline';
import { useAudit } from '../hooks/useAudit';
import { useProfile } from '../hooks/useProfile';
import { api } from '../data/apiService';
import { clientCanViewPortalPipeline } from '../lib/client-portal-pipeline-access';
import type { PipelineEvent, QualityGateReport } from '../data/auditTypes';
import {
  latestControlObjectForPhase,
  latestRefineForPhase,
  refineEventsForReviewBlock,
} from '../lib/pipeline-governance';
import { formatAuditWebsiteDisplay } from '../data/no-public-website';
import { WORKSPACE_PAGE_COPY } from '../config/workspace-page-copy';
import { PIPELINE_MONITOR_COPY as PM } from '../config/pipeline-monitor-copy';
import { UI_SEMANTIC_COLORS } from '../config/ui-semantic-colors';
import {
  ANALYTIC_WING_IDS,
  AUTO_WING_IDS,
  EXPRESS_MAX_PHASE,
  getPhaseStatus,
  type PhSt,
} from '../lib/pipeline-monitor-helpers';
import { isExpressLikeAudit } from '../lib/audit-execution-plan';
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
  const {
    state: pipelineState,
    loading: pipeLoading,
    error: pipeError,
    startPipeline,
    runNextPhase,
    stopPipeline,
    approveReview,
  } = usePipeline(id);
  const { audit, loading: auditLoading } = useAudit(id);
  const { isClient } = useProfile();
  const [clientPortalOk, setClientPortalOk] = useState<boolean | 'pending'>(() => (isClient ? 'pending' : true));
  /** Avoid flashing full-page loader when the same audit re-fetches (e.g. object identity changes). */
  const portalGateKeyRef = useRef<string | null>(null);
  const [sel, setSel] = useState(0);
  const [modalReview, setModalReview] = useState<{ afterPhase: number; label: string } | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);

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
    const gateKey = `${id}:${meta.status}:${meta.execution_plan?.coverage_package ?? ''}:${meta.execution_plan?.include_strategy === true ? 's1' : 's0'}`;
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
        setClientPortalOk(
          clientCanViewPortalPipeline({
            auditMeta: meta,
            brief: {
              gates: {
                canStartPipeline: d.gates?.canStartPipeline === true,
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

  const isExpress = audit?.meta ? isExpressLikeAudit(audit.meta) : false;
  // Build phase views from pipeline state
  const phases: PhaseView[] = useMemo(() => {
    if (!pipelineState || !audit) {
      return PHASE_META.map(pm => ({
        id: pm.id,
        name: pm.name,
        label: `${PM.phasePrefix} ${pm.id}`,
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
        label: `${PM.phasePrefix} ${pm.id}`,
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
    return event ? (event.data as unknown as QualityGateReport) : null;
  };

  const governanceRefinesForModal = useMemo(() => {
    if (!pipelineState?.events || !modalReview) return [];
    const evs = refineEventsForReviewBlock(pipelineState.events, modalReview.afterPhase);
    return evs.map(e => ({
      phase: e.phase,
      phaseLabel: PHASE_META.find(p => p.id === e.phase)?.name ?? `Phase ${e.phase}`,
      reasoning: typeof (e.data as { reasoning?: string }).reasoning === 'string'
        ? (e.data as { reasoning: string }).reasoning
        : '',
    }));
  }, [pipelineState, modalReview]);

  const ph         = phases.find(p => p.id === sel) ?? phases[0];
  const govCo      = pipelineState ? latestControlObjectForPhase(pipelineState.events, ph.id) : null;
  const govRefine  = pipelineState ? latestRefineForPhase(pipelineState.events, ph.id) : null;
  const activePhases = phases.filter(p => !p.skipped);
  const done       = activePhases.filter(p => p.status === 'completed').length;
  const pct        = Math.round((done / activePhases.length) * 100);
  const I    = ph.icon;

  const companyName =
    audit?.meta.company_name
    || formatAuditWebsiteDisplay(audit?.meta.company_url, audit?.meta.no_public_website)
    || audit?.meta.company_url
    || PM.loadingCompany;

  const workspacePath = id ? (isClient ? `/portal/audit/${id}` : `/audit/${id}`) : '/';

  async function handleApprove(_id: number, consultantNotes: string, interviewNotes: string) {
    if (!modalReview) return;
    await approveReview(modalReview.afterPhase, consultantNotes || undefined, interviewNotes || undefined);
    setModalReview(null);
  }

  async function handleStopPipeline() {
    if (isStopping) return;
    setIsStopping(true);
    try {
      await stopPipeline();
      setStopDialogOpen(false);
    } finally {
      setIsStopping(false);
    }
  }

  if (pipeLoading && !pipelineState) {
    return (
      <AppShell title={PM.pageTitle} subtitle={PM.loading}>
        <div className="flex items-center justify-center h-64">
          <ArrowsClockwise className="w-6 h-6 animate-spin" style={{ color: 'var(--glc-blue)' }} />
        </div>
      </AppShell>
    );
  }

  if (isClient && clientPortalOk === 'pending' && id) {
    return (
      <AppShell title={PM.pageTitle} subtitle={PM.loading}>
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
  const canStopPipeline = !['completed', 'failed', 'cancelled'].includes(auditStatus);

  return (
    <AppShell
      title={PM.pageTitle}
      subtitle={`${companyName} · ${PM.auditIdPrefix}${id?.slice(0, 8) ?? ''}`}
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
              {PM.expressBadge}
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
          <StatusPill
            status={
              auditStatus === 'completed'
                ? 'completed'
                : auditStatus === 'cancelled'
                  ? 'cancelled'
                  : auditStatus === 'failed'
                    ? 'review'
                    : 'running'
            }
            pulse={auditStatus !== 'completed' && auditStatus !== 'failed' && auditStatus !== 'cancelled'}
          />
          <button
            type="button"
            className="glc-btn-secondary"
            onClick={() => setStopDialogOpen(true)}
            disabled={!canStopPipeline || isStopping}
            style={{ color: 'var(--score-1)' }}
          >
            {isStopping ? (
              <>
                <ArrowsClockwise className="w-4 h-4 animate-spin" /> {PM.detail.stopPipelineStopping}
              </>
            ) : (
              <>
                <X className="w-4 h-4" /> {PM.detail.stopPipeline}
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="flex" style={{ height: 'calc(100vh - 56px)' }}>

        {/* ── Phase sidebar ────────────────────────── */}
        <aside
          className="w-[252px] flex-shrink-0 overflow-y-auto flex flex-col gap-1.5 p-3"
          style={{ borderRight: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
        >
          <div className="px-1 pb-1.5"><SectionLabel>{PM.sidebar.phases}</SectionLabel></div>

          <PhCard ph={phases[0]} active={sel === 0} onSel={() => setSel(0)} />
          <RevBanner
            review={getReviewForPhase(0)}
            label={PM.reviewPoints.one}
            onOpenModal={() => setModalReview({ afterPhase: 0, label: PM.reviewPoints.one })}
            hasWarnings={!getQualityGateForPhase(0)?.passed && (getQualityGateForPhase(0)?.flags.some(f => f.severity === 'warning') ?? false)}
            canApprove={!isClient}
          />

          {/* Auto wing — 2×2 grid to reflect parallel execution */}
          <div className="px-1 pt-2 pb-1 flex items-center gap-2">
            <SectionLabel>{PM.sidebar.autoWing}</SectionLabel>
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
              {PM.sidebar.parallelBadge}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {phases.filter(p => p.wing === 'auto').map(p => (
              <PhCard key={p.id} ph={p} active={sel === p.id} onSel={() => setSel(p.id)} />
            ))}
          </div>

          <RevBanner
            review={getReviewForPhase(4)}
            label={isExpress ? PM.reviewPoints.twoFinal : PM.reviewPoints.two}
            onOpenModal={() => setModalReview({ afterPhase: 4, label: isExpress ? PM.reviewPoints.twoFinal : PM.reviewPoints.two })}
            hasWarnings={!getQualityGateForPhase(4)?.passed && (getQualityGateForPhase(4)?.flags.some(f => f.severity === 'warning') ?? false)}
            canApprove={!isClient}
          />

          {/* Analytic wing — 2-column grid */}
          <div className="px-1 pt-2 pb-1 flex items-center gap-2" style={{ opacity: isExpress ? 0.4 : 1 }}>
            <SectionLabel>{PM.sidebar.analyticWing}</SectionLabel>
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
                {PM.sidebar.parallelBadge}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5" style={{ opacity: isExpress ? 0.35 : 1 }}>
            {phases.filter(p => p.wing === 'analytic').map(p => (
              <PhCard key={p.id} ph={p} active={sel === p.id} onSel={() => !p.skipped && setSel(p.id)} />
            ))}
          </div>

          <div className="px-1 pt-2 pb-1" style={{ opacity: isExpress ? 0.4 : 1 }}>
            <SectionLabel>{PM.sidebar.synthesis}</SectionLabel>
          </div>
          <PhCard ph={phases[7]} active={sel === 7} onSel={() => !phases[7].skipped && setSel(7)} />

          {!isExpress && (
            <RevBanner
              review={getReviewForPhase(7)}
              label={PM.reviewPoints.three}
              onOpenModal={() => setModalReview({ afterPhase: 7, label: PM.reviewPoints.three })}
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
                  {WORKSPACE_PAGE_COPY.pipelineMonitor.startReadyTitle}
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
                  {isExpress
                    ? WORKSPACE_PAGE_COPY.pipelineMonitor.startExpressDescription
                    : WORKSPACE_PAGE_COPY.pipelineMonitor.startFullDescription}
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startPipeline}
                  className="glc-btn-primary mx-auto"
                >
                  <Play className="w-4 h-4" /> {WORKSPACE_PAGE_COPY.pipelineMonitor.startPipelineButton}
                </motion.button>
              </div>
            )}

            {pipeError && (
              <div
                className="rounded-xl p-4 mb-4"
                style={{ backgroundColor: 'var(--score-1-bg)', border: '1px solid var(--score-1-border)', color: 'var(--score-1)' }}
              >
                <p className="text-sm font-medium">{PM.errorPrefix} {pipeError}</p>
              </div>
            )}

            {/* Parallel wing banners — shown when wing is actively running */}
            <AnimatePresence>
              {phases.some(p => AUTO_WING_IDS.includes(p.id) && p.status === 'running') && (
                <ParallelWingBanner
                  phases={phases.filter(p => AUTO_WING_IDS.includes(p.id))}
                  wingName={PM.parallelWing.autoName}
                />
              )}
              {phases.some(p => ANALYTIC_WING_IDS.includes(p.id) && p.status === 'running') && (
                <ParallelWingBanner
                  phases={phases.filter(p => ANALYTIC_WING_IDS.includes(p.id))}
                  wingName={PM.parallelWing.analyticName}
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
                        {PM.detail.agentRunning}
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
                    <p className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>{PM.detail.waitingTitle}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-quaternary)' }}>{PM.detail.waitingSubtitle}</p>
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
                      <WarningCircle className="w-4 h-4 flex-shrink-0" style={{ color: UI_SEMANTIC_COLORS.danger }} />
                      <span className="text-sm font-semibold" style={{ color: UI_SEMANTIC_COLORS.danger, fontFamily: 'var(--font-display)' }}>
                        {PM.detail.domainUnavailableTitle}
                      </span>
                    </div>
                    <p className="text-xs ml-6" style={{ color: 'var(--text-secondary)' }}>
                      {PM.detail.domainUnavailableBody}
                    </p>
                  </div>
                )}

                {/* CONTROL_OBJECT / Decision Layer (domain phases) */}
                {ph.status === 'completed' && govRefine && (
                  <div
                    className="rounded-xl p-4"
                    style={{
                      backgroundColor: 'rgba(234,179,8,0.08)',
                      border: '1px solid rgba(234,179,8,0.35)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <WarningCircle className="w-4 h-4 flex-shrink-0" style={{ color: UI_SEMANTIC_COLORS.warningAmber }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                        {PM.detail.governanceRefineTitle}
                      </span>
                    </div>
                    <p className="text-xs ml-6 mb-2" style={{ color: 'var(--text-secondary)' }}>
                      {PM.detail.governanceRefineBody}
                    </p>
                    <p className="text-xs ml-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {govRefine.reasoning}
                    </p>
                  </div>
                )}

                {ph.status === 'completed' && !govRefine && govCo?.decision_hint === 'accept_with_warnings' && (
                  <div
                    className="rounded-xl p-4"
                    style={{
                      backgroundColor: 'var(--glc-blue-xlight)',
                      border: '1px solid rgba(28,189,255,0.25)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--glc-blue)' }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                        {PM.detail.governanceWarningsTitle}
                      </span>
                    </div>
                    <p className="text-xs ml-6" style={{ color: 'var(--text-secondary)' }}>
                      {PM.detail.governanceWarningsBody}
                    </p>
                  </div>
                )}

                {ph.status === 'completed' && govCo && (
                  <div className="glc-card p-4" style={{ borderRadius: 'var(--radius-xl)' }}>
                    <SectionLabel className="mb-2">{PM.detail.governanceSummaryTitle}</SectionLabel>
                    {(govCo.auto_remediation_applied_count ?? 0) > 0 && (
                      <div
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg mb-3 inline-block"
                        style={{
                          backgroundColor: 'rgba(14,207,130,0.12)',
                          color: 'var(--glc-green-dark)',
                          border: '1px solid rgba(14,207,130,0.28)',
                          fontFamily: 'var(--font-display)',
                        }}
                        title={PM.detail.governanceAutoRemediationBadge.replace(
                          '{count}',
                          String(govCo.auto_remediation_applied_count),
                        )}
                      >
                        {PM.detail.governanceAutoRemediationBadge.replace(
                          '{count}',
                          String(govCo.auto_remediation_applied_count),
                        )}
                      </div>
                    )}
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <dt>{PM.detail.governanceConfidence}</dt>
                      <dd className="font-mono text-right">{govCo.confidence.overall}</dd>
                      <dt>{PM.detail.governanceClaims}</dt>
                      <dd className="font-mono text-right">{govCo.counts.total_claims}</dd>
                      <dt>{PM.detail.governanceHallucination}</dt>
                      <dd className="font-mono text-right">{govCo.counts.statuses.likely_hallucination}</dd>
                      <dt>{PM.detail.governanceRiskyPromise}</dt>
                      <dd className="font-mono text-right">{govCo.counts.statuses.risky_promise}</dd>
                    </dl>
                    {govCo.human_attention_required.required && (
                      <p className="text-xs mt-3" style={{ color: 'var(--callout-warning-fg)' }}>
                        {PM.detail.governanceHumanAttention}
                        {govCo.human_attention_required.reasons.length > 0
                          ? `: ${govCo.human_attention_required.reasons.join(', ')}`
                          : ''}
                      </p>
                    )}
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
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: UI_SEMANTIC_COLORS.danger }} />
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--callout-warning-icon)' }} />
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--glc-green)' }} />
                      </div>
                      <Terminal className="w-3.5 h-3.5 ml-2" style={{ color: 'rgba(255,255,255,0.35)' }} />
                      <span className="glc-label" style={{ color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em' }}>
                        {PM.detail.agentLogPrefix} {ph.name}
                      </span>
                    </div>
                    <div
                      className="p-4 space-y-2"
                      style={{ backgroundColor: UI_SEMANTIC_COLORS.codeSurface, fontFamily: 'var(--font-mono)', fontSize: '12px' }}
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
                            style={{
                              color: isOk
                                ? UI_SEMANTIC_COLORS.successLight
                                : isErr
                                  ? UI_SEMANTIC_COLORS.dangerLight
                                  : UI_SEMANTIC_COLORS.slateMuted,
                              lineHeight: 1.6,
                            }}
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
                      <SectionLabel>{PM.detail.domainScore}</SectionLabel>
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
                      {PM.detail.viewInWorkspace} <CaretRight className="w-4 h-4" />
                    </Link>
                  )}
                  {ph.status === 'review' && !isClient && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => runNextPhase()}
                      className="glc-btn-primary"
                    >
                      <Play className="w-4 h-4" /> {PM.detail.continuePipeline}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Token usage */}
            {pipelineState && (
              <div className="mt-6 flex items-center gap-4 text-xs" style={{ color: 'var(--text-quaternary)' }}>
                <span>{PM.detail.tokensUsedPrefix}<strong className="font-mono">{pipelineState.tokens_used.toLocaleString()}</strong>{PM.detail.tokensBudgetSeparator}{pipelineState.token_budget.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <ReviewPointModal
        open={!isClient && modalReview !== null}
        reviewPoint={modalReview ? { id: modalReview.afterPhase, label: modalReview.label, note: PM.reviewModal.defaultNote, after: modalReview.afterPhase } : null}
        onClose={() => setModalReview(null)}
        onApprove={handleApprove}
        qualityGate={modalReview ? getQualityGateForPhase(modalReview.afterPhase) : null}
        governanceRefines={governanceRefinesForModal}
        governanceRefineSectionTitle={PM.reviewModal.governanceRefineSectionTitle}
        governanceRefineSectionIntro={PM.reviewModal.governanceRefineSectionIntro}
      />
      <AlertDialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{PM.detail.stopPipeline}</AlertDialogTitle>
            <AlertDialogDescription>{PM.detail.stopPipelineConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isStopping}>{PM.detail.stopPipelineCancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleStopPipeline} disabled={isStopping}>
              {isStopping ? PM.detail.stopPipelineStopping : PM.detail.stopPipeline}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
