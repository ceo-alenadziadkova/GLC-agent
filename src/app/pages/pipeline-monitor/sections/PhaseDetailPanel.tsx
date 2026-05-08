import { useEffect, useMemo, useState } from 'react';
import { Play } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ANALYTIC_WING_IDS,
  AUTO_WING_IDS,
  hasVisiblyRunningUpstreamPhase,
  isPipelineAuditActiveStatus,
} from '../../../lib/pipeline-monitor-helpers';
import { STRATEGY_PHASE_ID } from '../phase-meta';
import { ParallelWingBanner } from '../PipelineMonitorPhaseUi';
import { AdminTokenBudgetTopupBanner } from './AdminTokenBudgetTopupBanner';
import { PIPELINE_MONITOR_UI_POLICY } from '../config/pipeline-monitor-ui-policy';
import type { ReconData } from '../../../data/auditTypes';
import type { AuditState } from '../../../data/audit/contracts/state/audit-state.types';
import type { PhaseView } from '../types';
import type { PipelineStateLite } from '../types-pipeline-state';
import { PipelineSummaryFooter } from './PipelineSummaryFooter';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { PIPELINE_MONITOR_COPY as PM } from '../../../config/pipeline-monitor-copy';
import type { PipelineErrorExtras } from '../../../hooks/usePipeline';
import { getPhaseResultViewPath } from '../utils/pipeline-monitor-format';
import {
  PhaseDetailActivityLog,
  PhaseDetailActions,
  PhaseDetailBanners,
  PhaseDetailGovernancePanel,
  PhaseDetailHeader,
  PhaseDetailStateCards,
  PhaseDetailStalledCallout,
  PhaseResultEditor,
  usePhaseResultEditor,
} from './phase-detail';
import { StrategyRepairedJsonApplyDialog } from './phase-detail/StrategyRepairedJsonApplyDialog';

export function PhaseDetailPanel(props: {
  selectedPhase: PhaseView;
  phases: PhaseView[];
  /** Phases included in `execution_plan` coverage; null = show all (legacy). */
  plannedExecutionPhaseIds?: ReadonlySet<number> | null;
  pipelineState: PipelineStateLite | null;
  pipeError: string | null;
  pipelineErrorExtras: PipelineErrorExtras | null;
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
  canStopPipeline: boolean;
  isStopping: boolean;
  resumeCancelledBusy: boolean;
  resumeCancelledError: string | null;
  resumeAutoNextBlockedNotice: PipelineErrorExtras | null;
  onOpenStopDialog: () => void;
  onResumeCancelledPlatform: () => void | Promise<void>;
  onStartPipeline: () => void;
  onRunNextPhase: () => void;
  /** True while Continue → POST /pipeline/next is in flight. */
  runNextPhaseBusy: boolean;
  onRetryPhase: (phase: number, opts?: { retry_comment?: string }) => void | Promise<void>;
  audit: AuditState | null;
  onRefreshAfterPhaseEdit: () => Promise<void>;
  /** Reload pipeline + audit state after platform admin tops up the token budget. */
  onTokenBudgetTopupSuccess: () => Promise<void>;
}) {
  const {
    selectedPhase,
    phases,
    plannedExecutionPhaseIds = null,
    pipelineState,
    pipeError,
    pipelineErrorExtras,
    isCreated,
    isClient,
    isExpress,
    recon,
    showReconCrawlerTruncationWarning,
    auditId,
    governance,
    auditStatus,
    canManagePlatformSettings,
    canStopPipeline,
    isStopping,
    resumeCancelledBusy,
    resumeCancelledError,
    resumeAutoNextBlockedNotice,
    onOpenStopDialog,
    onResumeCancelledPlatform,
    onStartPipeline,
    onRunNextPhase,
    runNextPhaseBusy,
    onRetryPhase,
    audit,
    onRefreshAfterPhaseEdit,
    onTokenBudgetTopupSuccess,
  } = props;

  const [rerunCommentDraft, setRerunCommentDraft] = useState('');
  const [strategyRepairedDialogOpen, setStrategyRepairedDialogOpen] = useState(false);
  const [phaseStallTickMs, setPhaseStallTickMs] = useState(() => Date.now());

  const detailCopy = useMemo(
    () => (isClient ? { ...PM.detail, ...PM.clientPortal.detail } : PM.detail),
    [isClient],
  );

  const phaseResultEditorCopy = PM.detail.phaseResultEditor;

  const phaseEditor = usePhaseResultEditor({
    audit,
    auditId,
    selectedPhase,
    onRefreshAfterPhaseEdit,
    editorCopy: phaseResultEditorCopy,
  });

  const currentPhase = pipelineState?.current_phase ?? -1;

  const strategyRepairedJsonCta = useMemo(() => {
    if (!auditId || isClient || !canManagePlatformSettings || selectedPhase.id !== STRATEGY_PHASE_ID) {
      return null;
    }
    const sr = PM.detail.strategyRepairedJsonApply;
    return { label: sr.button, hint: sr.buttonHint };
  }, [auditId, canManagePlatformSettings, isClient, selectedPhase.id]);

  const blockingPendingReview = useMemo(() => {
    const revs = pipelineState?.reviews;
    if (!revs?.length || selectedPhase.skipped) return null;
    return revs.find((r) => {
      if (r.status !== 'pending') return false;
      if (r.after_phase >= selectedPhase.id) return false;
      if (
        plannedExecutionPhaseIds != null &&
        plannedExecutionPhaseIds.size > 0 &&
        !plannedExecutionPhaseIds.has(r.after_phase)
      ) {
        return false;
      }
      return true;
    });
  }, [plannedExecutionPhaseIds, pipelineState?.reviews, selectedPhase.id, selectedPhase.skipped]);

  const upstreamPhaseVisiblyRunning = hasVisiblyRunningUpstreamPhase(phases, selectedPhase.id);

  const upstreamOrchestratorBusy =
    !selectedPhase.skipped &&
    auditStatus !== PIPELINE_MONITOR_UI_POLICY.status.failed &&
    isPipelineAuditActiveStatus(auditStatus) &&
    currentPhase >= 0 &&
    currentPhase < selectedPhase.id &&
    !blockingPendingReview &&
    upstreamPhaseVisiblyRunning;

  const isSkippedForCoveragePlan =
    selectedPhase.skipped &&
    plannedExecutionPhaseIds != null &&
    plannedExecutionPhaseIds.size > 0 &&
    !plannedExecutionPhaseIds.has(selectedPhase.id);

  const pendingReviewForCurrentPhase = pipelineState?.reviews?.find(
    (r) => r.after_phase === currentPhase && r.status === 'pending',
  );
  const isReviewBlockingContinue = Boolean(pendingReviewForCurrentPhase);
  const showContinuePipeline =
    !isClient &&
    auditStatus === PIPELINE_MONITOR_UI_POLICY.status.review &&
    !isReviewBlockingContinue;

  const phaseHasAgentOutput =
    selectedPhase.status === 'completed' || selectedPhase.status === PIPELINE_MONITOR_UI_POLICY.status.review;
  const canEditPhaseResult = !isClient && phaseHasAgentOutput && selectedPhase.id >= 1;

  const canManualRerunPhase =
    !isClient &&
    !selectedPhase.skipped &&
    !isPipelineAuditActiveStatus(auditStatus) &&
    auditStatus !== PIPELINE_MONITOR_UI_POLICY.status.cancelled &&
    auditStatus !== PIPELINE_MONITOR_UI_POLICY.status.created &&
    (selectedPhase.status === 'completed' ||
      selectedPhase.status === PIPELINE_MONITOR_UI_POLICY.status.review ||
      selectedPhase.status === PIPELINE_MONITOR_UI_POLICY.status.failed);

  const phaseResultPath = getPhaseResultViewPath({
    phaseId: selectedPhase.id,
    auditId,
    isClient,
    auditStatus,
  });
  const phaseResultLinkLabel =
    selectedPhase.id === STRATEGY_PHASE_ID
      ? detailCopy.viewStrategyRoadmap
      : isClient && auditStatus === PIPELINE_MONITOR_UI_POLICY.status.completed
        ? detailCopy.viewReport
        : detailCopy.viewInWorkspace;

  const showPhaseResultLink =
    !isClient ||
    selectedPhase.id === STRATEGY_PHASE_ID ||
    auditStatus === PIPELINE_MONITOR_UI_POLICY.status.completed;

  const qualityRunningAuto = phases.some((phase) => AUTO_WING_IDS.includes(phase.id) && phase.status === 'running');
  const qualityRunningAnalytic = phases.some(
    (phase) => ANALYTIC_WING_IDS.includes(phase.id) && phase.status === 'running',
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPhaseStallTickMs(Date.now());
    }, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const selectedPhaseLatestEventAtMs = useMemo(() => {
    const event = (pipelineState?.events ?? []).find((row) => row.phase === selectedPhase.id);
    if (!event) return null;
    const ts = Date.parse(event.created_at);
    return Number.isFinite(ts) ? ts : null;
  }, [pipelineState?.events, selectedPhase.id]);

  const selectedPhaseTimedOutWithoutActivity = useMemo(() => {
    if (selectedPhase.status !== 'running' || selectedPhaseLatestEventAtMs == null) return false;
    const timeoutMs = PIPELINE_MONITOR_UI_POLICY.resilience.stalledPhaseWarningTimeoutMin * 60_000;
    return phaseStallTickMs - selectedPhaseLatestEventAtMs >= timeoutMs;
  }, [phaseStallTickMs, selectedPhase.status, selectedPhaseLatestEventAtMs]);

  const selectedPhaseStalled = useMemo(() => {
    const events = pipelineState?.events ?? [];
    const latestLifecycleSignal = events.find((event) => {
      if (event.phase !== selectedPhase.id) return false;
      return (
        event.event_type === 'phase_stalled' ||
        event.event_type === 'completed' ||
        event.event_type === 'error' ||
        event.event_type === 'started'
      );
    });
    return selectedPhase.status === 'running' && latestLifecycleSignal?.event_type === 'phase_stalled';
  }, [pipelineState?.events, selectedPhase.id, selectedPhase.status]);

  return (
    <div className="bg-background flex h-full min-h-0 flex-1 flex-col overflow-y-auto">
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

        <AdminTokenBudgetTopupBanner
          auditId={auditId}
          pipelineState={pipelineState}
          pipelineErrorExtras={pipelineErrorExtras}
          canManagePlatformSettings={canManagePlatformSettings}
          isClient={isClient}
          onTopupSuccess={onTokenBudgetTopupSuccess}
        />

        <PhaseDetailBanners
          isCreated={isCreated}
          isClient={isClient}
          pipeError={pipeError}
          pipelineErrorExtras={pipelineErrorExtras}
          auditId={auditId}
          auditStatus={auditStatus}
          canManagePlatformSettings={canManagePlatformSettings}
          resumeCancelledBusy={resumeCancelledBusy}
          resumeCancelledError={resumeCancelledError}
          resumeAutoNextBlockedNotice={resumeAutoNextBlockedNotice}
          onResumeCancelledPlatform={onResumeCancelledPlatform}
          detailCopy={detailCopy}
        />

        <AnimatePresence>
          {qualityRunningAuto && (
            <ParallelWingBanner
              phases={phases.filter((phase) => AUTO_WING_IDS.includes(phase.id))}
              wingName={isClient ? PM.clientPortal.parallelWing.autoName : PM.parallelWing.autoName}
              runningSuffix={isClient ? PM.clientPortal.parallelWing.runningSuffix : undefined}
            />
          )}
          {qualityRunningAnalytic && (
            <ParallelWingBanner
              phases={phases.filter((phase) => ANALYTIC_WING_IDS.includes(phase.id))}
              wingName={isClient ? PM.clientPortal.parallelWing.analyticName : PM.parallelWing.analyticName}
              runningSuffix={isClient ? PM.clientPortal.parallelWing.runningSuffix : undefined}
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
            <PhaseDetailHeader selectedPhase={selectedPhase} />

            <PhaseDetailStateCards
              selectedPhase={selectedPhase}
              isClient={isClient}
              isCreated={isCreated}
              recon={recon}
              showReconCrawlerTruncationWarning={showReconCrawlerTruncationWarning}
              isSkippedForCoveragePlan={isSkippedForCoveragePlan}
              blockingPendingReview={blockingPendingReview}
              upstreamOrchestratorBusy={upstreamOrchestratorBusy}
              auditStatus={auditStatus}
              pipelineState={pipelineState}
              onRetryPhase={onRetryPhase}
              detailCopy={detailCopy}
            />

            <PhaseDetailStalledCallout
              selectedPhase={selectedPhase}
              selectedPhaseStalled={selectedPhaseStalled}
              selectedPhaseTimedOutWithoutActivity={selectedPhaseTimedOutWithoutActivity}
              isClient={isClient}
              canStopPipeline={canStopPipeline}
              isStopping={isStopping}
              canManualRerunPhase={canManualRerunPhase}
              rerunCommentDraft={rerunCommentDraft}
              setRerunCommentDraft={setRerunCommentDraft}
              onOpenStopDialog={onOpenStopDialog}
              onRetryPhase={onRetryPhase}
              detailCopy={detailCopy}
              strategyRepairedJsonCta={strategyRepairedJsonCta}
              onOpenStrategyRepairedJsonApply={() => setStrategyRepairedDialogOpen(true)}
            />

            <PhaseDetailGovernancePanel
              governance={governance}
              phaseHasAgentOutput={phaseHasAgentOutput}
              isClient={isClient}
              detailCopy={detailCopy}
            />

            <PhaseDetailActivityLog selectedPhase={selectedPhase} isClient={isClient} detailCopy={detailCopy} />

            <PhaseDetailActions
              selectedPhase={selectedPhase}
              phaseHasAgentOutput={phaseHasAgentOutput}
              canEditPhaseResult={canEditPhaseResult}
              showPhaseResultLink={showPhaseResultLink}
              phaseResultPath={phaseResultPath}
              phaseResultLinkLabel={phaseResultLinkLabel}
              canManualRerunPhase={canManualRerunPhase}
              showContinuePipeline={showContinuePipeline}
              runNextPhaseBusy={runNextPhaseBusy}
              resumeCancelledBusy={resumeCancelledBusy}
              isClient={isClient}
              rerunCommentDraft={rerunCommentDraft}
              setRerunCommentDraft={setRerunCommentDraft}
              onOpenPhaseResultEditor={phaseEditor.open}
              onRetryPhase={onRetryPhase}
              onRunNextPhase={onRunNextPhase}
              editorOpenCta={phaseResultEditorCopy.openCta}
              detailCopy={detailCopy}
              strategyRepairedJsonCta={strategyRepairedJsonCta}
              onOpenStrategyRepairedJsonApply={() => setStrategyRepairedDialogOpen(true)}
            />

            {auditId && strategyRepairedJsonCta ? (
              <StrategyRepairedJsonApplyDialog
                open={strategyRepairedDialogOpen}
                onOpenChange={setStrategyRepairedDialogOpen}
                auditId={auditId}
                strategyRepairedApplyCopy={PM.detail.strategyRepairedJsonApply}
                onApplied={onRefreshAfterPhaseEdit}
              />
            ) : null}

            <PhaseResultEditor
              isOpen={phaseEditor.isOpen}
              selectedPhase={selectedPhase}
              editorCopy={phaseResultEditorCopy}
              busy={phaseEditor.busy}
              error={phaseEditor.error}
              onSave={phaseEditor.save}
              onCancel={phaseEditor.cancel}
              executiveSummaryDraft={phaseEditor.executiveSummaryDraft}
              setExecutiveSummaryDraft={phaseEditor.setExecutiveSummaryDraft}
              labelDraft={phaseEditor.labelDraft}
              setLabelDraft={phaseEditor.setLabelDraft}
              summaryDraft={phaseEditor.summaryDraft}
              setSummaryDraft={phaseEditor.setSummaryDraft}
              strengthsDraft={phaseEditor.strengthsDraft}
              setStrengthsDraft={phaseEditor.setStrengthsDraft}
              weaknessesDraft={phaseEditor.weaknessesDraft}
              setWeaknessesDraft={phaseEditor.setWeaknessesDraft}
              issuesDraft={phaseEditor.issuesDraft}
              setIssuesDraft={phaseEditor.setIssuesDraft}
              quickWinsDraft={phaseEditor.quickWinsDraft}
              setQuickWinsDraft={phaseEditor.setQuickWinsDraft}
              recommendationsDraft={phaseEditor.recommendationsDraft}
              setRecommendationsDraft={phaseEditor.setRecommendationsDraft}
            />
          </motion.div>
        </AnimatePresence>

        <PipelineSummaryFooter pipelineState={pipelineState} isClient={isClient} />
      </div>
    </div>
  );
}
