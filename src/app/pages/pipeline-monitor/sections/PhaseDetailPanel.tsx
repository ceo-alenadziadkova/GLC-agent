import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowsClockwise,
  CaretRight,
  Check,
  CircleNotch,
  Clock,
  Info,
  Play,
  Terminal,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import { ReconReviewSummary } from '../../../components/glc/ReconReviewSummary';
import { ScoreBadge } from '../../../components/glc/ScoreBadge';
import { SectionLabel } from '../../../components/glc/SectionLabel';
import { StatusPill } from '../../../components/glc/StatusPill';
import { Callout } from '../../../../design-system/ui';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { PIPELINE_MONITOR_COPY as PM } from '../../../config/pipeline-monitor-copy';
import { ANALYTIC_WING_IDS, AUTO_WING_IDS } from '../../../lib/pipeline-monitor-helpers';
import { getPhaseResultViewPath } from '../utils/pipeline-monitor-format';
import { STRATEGY_PHASE_ID } from '../phase-meta';
import { ParallelWingBanner } from '../PipelineMonitorPhaseUi';
import { PIPELINE_MONITOR_UI_POLICY } from '../config/pipeline-monitor-ui-policy';
import type { ReconData } from '../../../data/auditTypes';
import type { PhaseView } from '../types';
import type { PipelineStateLite } from '../types-pipeline-state';
import { PipelineSummaryFooter } from './PipelineSummaryFooter';
import { cn } from '../../../components/ui/utils';
import { Button } from '../../../components/ui/button';

export function PhaseDetailPanel(props: {
  selectedPhase: PhaseView;
  phases: PhaseView[];
  pipelineState: PipelineStateLite | null;
  pipeError: string | null;
  isCreated: boolean;
  isClient: boolean;
  isExpress: boolean;
  recon: ReconData | null;
  showReconCrawlerTruncationWarning: boolean;
  auditId: string | undefined;
  governance: {
    controlObject: {
      decision_hint?: string;
      auto_remediation_applied_count?: number;
      confidence: { overall: number };
      counts: {
        total_claims: number;
        statuses: { likely_hallucination: number; risky_promise: number };
      };
      human_attention_required: { required: boolean; reasons: string[] };
    } | null;
    refine: { reasoning: string } | null;
  };
  auditStatus: string;
  canManagePlatformSettings: boolean;
  resumeCancelledBusy: boolean;
  resumeCancelledError: string | null;
  onResumeCancelledPlatform: () => void | Promise<void>;
  onStartPipeline: () => void;
  onRunNextPhase: () => void;
  /** True while Continue → POST /pipeline/next is in flight. */
  runNextPhaseBusy: boolean;
  onRetryPhase: (phase: number) => void | Promise<void>;
}) {
  const {
    selectedPhase,
    phases,
    pipelineState,
    pipeError,
    isCreated,
    isClient,
    isExpress,
    recon,
    showReconCrawlerTruncationWarning,
    auditId,
    governance,
    auditStatus,
    canManagePlatformSettings,
    resumeCancelledBusy,
    resumeCancelledError,
    onResumeCancelledPlatform,
    onStartPipeline,
    onRunNextPhase,
    runNextPhaseBusy,
    onRetryPhase,
  } = props;
  const currentPhase = pipelineState?.current_phase ?? -1;
  /** Mirrors server `fetchPendingReviewAfterPhase(auditId, current_phase)` — blocks Continue until this gate is approved. */
  const pendingReviewForCurrentPhase = pipelineState?.reviews?.find(
    r => r.after_phase === currentPhase && r.status === 'pending',
  );
  const isReviewBlockingContinue = Boolean(pendingReviewForCurrentPhase);
  /** Show from any selected phase so consultants on Strategy (7) still see Continue when `current_phase` is 6, etc. */
  const showContinuePipeline =
    !isClient &&
    auditStatus === PIPELINE_MONITOR_UI_POLICY.status.review &&
    !isReviewBlockingContinue;

  /** Agent finished this phase (`completed`), or pipeline paused at a review gate (`review`) — show outputs and workspace link. */
  const phaseHasAgentOutput =
    selectedPhase.status === 'completed' || selectedPhase.status === PIPELINE_MONITOR_UI_POLICY.status.review;

  const phaseResultPath = getPhaseResultViewPath({
    phaseId: selectedPhase.id,
    auditId,
    isClient,
    auditStatus,
  });
  const phaseResultLinkLabel =
    selectedPhase.id === STRATEGY_PHASE_ID
      ? PM.detail.viewStrategyRoadmap
      : isClient && auditStatus === PIPELINE_MONITOR_UI_POLICY.status.completed
        ? PM.detail.viewReport
      : PM.detail.viewInWorkspace;

  /** Portal clients: no consultant-style workspace shortcut; keep Strategy Lab + finished report only. */
  const showPhaseResultLink =
    !isClient ||
    selectedPhase.id === STRATEGY_PHASE_ID ||
    auditStatus === PIPELINE_MONITOR_UI_POLICY.status.completed;

  const Icon = selectedPhase.icon;
  const qualityRunningAuto = phases.some(phase => AUTO_WING_IDS.includes(phase.id) && phase.status === 'running');
  const qualityRunningAnalytic = phases.some(
    phase => ANALYTIC_WING_IDS.includes(phase.id) && phase.status === 'running',
  );

  return (
    <div className="bg-background flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto ds-pattern-page-shell-body">
        {isCreated && (
          <div className="glc-card mb-6 rounded-xl p-8 text-center">
            <Play className="text-info mx-auto mb-3 h-10 w-10" />
            <h3 className="text-foreground mb-2 text-lg font-semibold">
              {WORKSPACE_PAGE_COPY.pipelineMonitor.startReadyTitle}
            </h3>
            <p className="text-muted-foreground mb-4 text-sm">
              {isExpress
                ? WORKSPACE_PAGE_COPY.pipelineMonitor.startExpressDescription
                : WORKSPACE_PAGE_COPY.pipelineMonitor.startFullDescription}
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStartPipeline}
              className="mx-auto inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
            >
              <Play className="w-4 h-4" /> {WORKSPACE_PAGE_COPY.pipelineMonitor.startPipelineButton}
            </motion.button>
          </div>
        )}

        {pipeError && (
          <Callout intent="danger" className="mb-4 p-4">
            <p className="text-sm font-medium text-[var(--score-1)]">
              {PM.errorPrefix} {pipeError}
            </p>
          </Callout>
        )}

        {isClient && auditStatus === PIPELINE_MONITOR_UI_POLICY.status.review && (
          <Callout intent="info" className="mb-4 p-4" title={PM.detail.clientReviewGateTitle}>
            {PM.detail.clientReviewGateBody}
          </Callout>
        )}

        {auditStatus === PIPELINE_MONITOR_UI_POLICY.status.cancelled && !canManagePlatformSettings && !isClient && (
          <Callout intent="warning" className="mb-4 p-4">
            <p className="text-foreground text-sm font-medium">{PM.detail.pipelineCancelledConsultantTitle}</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{PM.detail.pipelineCancelledConsultantBody}</p>
          </Callout>
        )}

        {auditStatus === PIPELINE_MONITOR_UI_POLICY.status.cancelled && canManagePlatformSettings && !isClient && (
          <Callout intent="warning" className="mb-4 p-4">
            <p className="text-foreground mb-2 text-sm font-medium">{PM.detail.resumeCancelledPlatform}</p>
            <p className="text-muted-foreground mb-3 text-xs">{PM.detail.resumeCancelledPlatformHint}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={resumeCancelledBusy}
              onClick={() => void onResumeCancelledPlatform()}
            >
              {resumeCancelledBusy ? (
                <>
                  <ArrowsClockwise className="w-4 h-4 animate-spin" /> {PM.detail.resumeCancelledPlatformBusy}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> {PM.detail.resumeCancelledPlatform}
                </>
              )}
            </Button>
            {resumeCancelledError && (
              <p className="text-[var(--score-1)] mt-2 text-xs font-medium">
                {PM.errorPrefix} {resumeCancelledError}
              </p>
            )}
          </Callout>
        )}

        <AnimatePresence>
          {qualityRunningAuto && (
            <ParallelWingBanner phases={phases.filter(phase => AUTO_WING_IDS.includes(phase.id))} wingName={PM.parallelWing.autoName} />
          )}
          {qualityRunningAnalytic && (
            <ParallelWingBanner
              phases={phases.filter(phase => ANALYTIC_WING_IDS.includes(phase.id))}
              wingName={PM.parallelWing.analyticName}
            />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedPhase.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: PIPELINE_MONITOR_UI_POLICY.animation.panelTransitionDurationSec, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5"
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl',
                  selectedPhase.status === 'completed'
                    ? 'bg-[var(--gradient-success)] shadow-[var(--glow-green)]'
                    : selectedPhase.status === 'running'
                      ? 'bg-[var(--gradient-brand)] shadow-[var(--glow-blue-sm)]'
                      : 'bg-muted',
                )}
              >
                <Icon className={cn('h-6 w-6', selectedPhase.status === 'pending' ? 'text-muted-foreground' : 'text-primary-foreground')} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-foreground text-xl font-bold tracking-tight">
                    {selectedPhase.label}: {selectedPhase.name}
                  </h2>
                  <StatusPill status={selectedPhase.status} pulse={selectedPhase.status === 'running'} />
                </div>
                <div className="text-muted-foreground mt-1.5 flex items-center gap-3 text-xs">
                  {selectedPhase.score !== null && <ScoreBadge score={selectedPhase.score} showLabel size="md" />}
                </div>
              </div>
            </div>

            {selectedPhase.id === 0 && !isClient && !isCreated ? (
              <div className="space-y-3">
                <SectionLabel>{PM.detail.reconPreviewSectionTitle}</SectionLabel>
                <ReconReviewSummary
                  recon={recon}
                  showCrawlerTruncationWarning={showReconCrawlerTruncationWarning}
                  copy={{
                    ...PM.reviewModal.recon,
                    introTitle: PM.detail.reconPreviewIntroTitle,
                    introBody: PM.detail.reconPreviewIntroBody,
                  }}
                />
              </div>
            ) : null}

            {selectedPhase.status === 'running' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-info/10 border-info/30 rounded-xl border p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <ArrowsClockwise className="text-info h-4 w-4 animate-spin" />
                  <span className="text-info text-sm font-semibold">
                    {PM.detail.agentRunning}
                  </span>
                </div>
                <div className="bg-info/20 h-1 overflow-hidden rounded-full">
                  <motion.div
                    className="h-full rounded-full bg-[var(--gradient-brand)] shadow-[var(--glow-blue-sm)]"
                    initial={{ width: '20%' }}
                    animate={{ width: '75%' }}
                    transition={{ duration: PIPELINE_MONITOR_UI_POLICY.animation.runningBarDurationSec, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' }}
                  />
                </div>
              </motion.div>
            )}

            {selectedPhase.status === 'pending' && (
              <div className="glc-card rounded-xl border-dashed p-10 text-center">
                {auditStatus === PIPELINE_MONITOR_UI_POLICY.status.failed ? (
                  <>
                    <WarningCircle className="text-destructive mx-auto mb-3 h-8 w-8" />
                    <p className="text-foreground text-sm font-medium">
                      {PM.detail.pipelineFailedPendingTitle}
                    </p>
                    <p className="text-muted-foreground mx-auto mt-2 max-w-md text-xs leading-relaxed">
                      {PM.detail.pipelineFailedPendingSubtitle}
                    </p>
                    {!isClient && pipelineState != null && (
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => void onRetryPhase(pipelineState.current_phase)}
                        className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
                      >
                        <ArrowsClockwise className="w-4 h-4" /> {PM.header.retryFailedPipeline}
                      </motion.button>
                    )}
                  </>
                ) : (
                  <>
                    <Clock className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
                    <p className="text-muted-foreground text-sm font-medium">
                      {PM.detail.waitingTitle}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {PM.detail.waitingSubtitle}
                    </p>
                  </>
                )}
              </div>
            )}

            {selectedPhase.status === PIPELINE_MONITOR_UI_POLICY.status.failed && (
              <Callout intent="danger" className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <WarningCircle className="text-destructive h-4 w-4 flex-shrink-0" />
                  <span className="text-destructive text-sm font-semibold">
                    {PM.detail.domainUnavailableTitle}
                  </span>
                </div>
                <p className="text-muted-foreground ml-6 text-xs">
                  {PM.detail.domainUnavailableBody}
                </p>
              </Callout>
            )}

            {phaseHasAgentOutput && governance.refine && (
              <div className="bg-warning/10 border-warning/40 rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <WarningCircle className="text-warning h-4 w-4 flex-shrink-0" />
                  <span className="text-foreground text-sm font-semibold">
                    {PM.detail.governanceRefineTitle}
                  </span>
                </div>
                <p className="text-muted-foreground ml-6 mb-2 text-xs">
                  {PM.detail.governanceRefineBody}
                </p>
                <p className="text-muted-foreground ml-6 text-xs leading-relaxed">
                  {governance.refine.reasoning}
                </p>
              </div>
            )}

            {phaseHasAgentOutput && !governance.refine && governance.controlObject?.decision_hint === 'accept_with_warnings' && (
              <div className="bg-info/10 border-info/40 rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="text-info h-4 w-4 flex-shrink-0" />
                  <span className="text-foreground text-sm font-semibold">
                    {PM.detail.governanceWarningsTitle}
                  </span>
                </div>
                <p className="text-muted-foreground ml-6 text-xs">
                  {PM.detail.governanceWarningsBody}
                </p>
              </div>
            )}

            {phaseHasAgentOutput && governance.controlObject && (
              <div className="glc-card rounded-xl p-4">
                <SectionLabel className="mb-2">{PM.detail.governanceSummaryTitle}</SectionLabel>
                {(governance.controlObject.auto_remediation_applied_count ?? 0) > 0 && (
                  <div
                    className="text-success mb-3 inline-block rounded-lg border border-success/40 bg-success/10 px-2.5 py-1.5 text-xs font-semibold"
                  >
                    {PM.detail.governanceAutoRemediationBadge.replace(
                      '{count}',
                      String(governance.controlObject.auto_remediation_applied_count),
                    )}
                  </div>
                )}
                <dl className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <dt>{PM.detail.governanceConfidence}</dt>
                  <dd className="font-mono text-right">{governance.controlObject.confidence.overall}</dd>
                  <dt>{PM.detail.governanceClaims}</dt>
                  <dd className="font-mono text-right">{governance.controlObject.counts.total_claims}</dd>
                  <dt>{PM.detail.governanceHallucination}</dt>
                  <dd className="font-mono text-right">{governance.controlObject.counts.statuses.likely_hallucination}</dd>
                  <dt>{PM.detail.governanceRiskyPromise}</dt>
                  <dd className="font-mono text-right">{governance.controlObject.counts.statuses.risky_promise}</dd>
                </dl>
                {governance.controlObject.human_attention_required.required && (
                  <p className="text-warning-foreground mt-3 text-xs">
                    {PM.detail.governanceHumanAttention}
                    {governance.controlObject.human_attention_required.reasons.length > 0
                      ? `: ${governance.controlObject.human_attention_required.reasons.join(', ')}`
                      : ''}
                  </p>
                )}
              </div>
            )}

            {selectedPhase.log.length > 0 && (
              <div className="overflow-hidden rounded-xl border shadow-md">
                <div className="border-b border-[var(--overlay-white-20)] bg-[var(--ui-code-surface)] flex items-center gap-2 px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-destructive h-2.5 w-2.5 rounded-full" />
                    <span className="bg-warning h-2.5 w-2.5 rounded-full" />
                    <span className="bg-success h-2.5 w-2.5 rounded-full" />
                  </div>
                  <Terminal className="ml-2 h-3.5 w-3.5 text-[var(--overlay-white-35)]" />
                  <span className="text-[var(--overlay-white-30)] text-xs font-bold ds-pipeline-log-header-tracking uppercase">
                    {PM.detail.agentLogPrefix} {selectedPhase.name}
                  </span>
                </div>
                <div className="bg-[var(--glc-ink)] font-mono space-y-2 p-4 text-xs">
                  {selectedPhase.log.map((entry, index) => {
                    const isOk = entry.eventType === 'completed' || entry.eventType === 'fact_check';
                    const isErr = entry.eventType === 'error';
                    return (
                      <motion.div
                        key={`${entry.text}-${index}`}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: index * PIPELINE_MONITOR_UI_POLICY.animation.logEntryDelayStepSec,
                          duration: PIPELINE_MONITOR_UI_POLICY.animation.logEntryDurationSec,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className={cn(
                          'flex items-start gap-1.5 leading-relaxed',
                          isOk ? 'text-emerald-300' : isErr ? 'text-rose-300' : 'text-slate-400',
                        )}
                      >
                        {isOk ? (
                          <Check size={11} weight="bold" className="ds-pipeline-log-icon-mt shrink-0" />
                        ) : isErr ? (
                          <X size={11} weight="bold" className="ds-pipeline-log-icon-mt shrink-0" />
                        ) : (
                          <CircleNotch size={11} className="ds-pipeline-log-icon-mt shrink-0" />
                        )}
                        <span>{entry.text}</span>
                      </motion.div>
                    );
                  })}
                  {selectedPhase.status === 'running' && (
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: PIPELINE_MONITOR_UI_POLICY.animation.cursorBlinkDurationSec, repeat: Infinity }}
                      className="text-info inline-block"
                    >
                      ▌
                    </motion.span>
                  )}
                </div>
              </div>
            )}

            {phaseHasAgentOutput && selectedPhase.score !== null && (
              <div className="glc-card rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <SectionLabel>{PM.detail.domainScore}</SectionLabel>
                  <ScoreBadge score={selectedPhase.score} showLabel size="lg" />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              {phaseHasAgentOutput && showPhaseResultLink && (
                <Button asChild variant="outline" size="sm" className="no-underline">
                  <Link to={phaseResultPath}>
                    {phaseResultLinkLabel} <CaretRight className="w-4 h-4" />
                  </Link>
                </Button>
              )}
              {selectedPhase.status === PIPELINE_MONITOR_UI_POLICY.status.failed && !isClient && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => void onRetryPhase(selectedPhase.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
                >
                  <ArrowsClockwise className="w-4 h-4" /> {PM.detail.retryFailedPhase}
                </motion.button>
              )}
              {showContinuePipeline && (
                <motion.button
                  type="button"
                  whileHover={runNextPhaseBusy ? undefined : { scale: 1.02 }}
                  whileTap={runNextPhaseBusy ? undefined : { scale: 0.98 }}
                  disabled={runNextPhaseBusy || resumeCancelledBusy}
                  aria-busy={runNextPhaseBusy}
                  onClick={() => void onRunNextPhase()}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90',
                    (runNextPhaseBusy || resumeCancelledBusy) && 'pointer-events-none opacity-70',
                  )}
                >
                  {runNextPhaseBusy ? (
                    <>
                      <CircleNotch className="h-4 w-4 animate-spin" aria-hidden />
                      {PM.detail.continuePipelineBusy}
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" aria-hidden />
                      {PM.detail.continuePipeline}
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <PipelineSummaryFooter pipelineState={pipelineState} />
      </div>
    </div>
  );
}
