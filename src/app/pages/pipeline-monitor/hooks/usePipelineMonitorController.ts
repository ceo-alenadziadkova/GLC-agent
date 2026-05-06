import { useCallback, useMemo, useRef, useState } from 'react';
import { useAudit } from '../../../hooks/useAudit';
import { usePipeline } from '../../../hooks/usePipeline';
import { useProfile } from '../../../hooks/useProfile';
import { api } from '../../../data/apiService';
import { toUiApiErrorMessage } from '../../../lib/api-error-ui';
import { getGlcQueryClient } from '../../../lib/glc-query-client';
import { invalidateAuditRelatedQueries } from '../../../lib/glc-invalidate-queries';
import { PIPELINE_MONITOR_UI_POLICY } from '../config/pipeline-monitor-ui-policy';
import { useClientPortalPipelineGate } from './useClientPortalPipelineGate';
import {
  selectIsExpressAudit,
  selectPhaseViews,
  selectPipelineProgressPct,
} from '../selectors/phase-view.selector';
import { APP_FEATURE_FLAGS } from '../../../config/app-feature-flags';
import {
  reviewNotesMeetSubstantiveMinimum,
  selectableAutoWingDomainPhasesForReviewRerun,
} from '../../../config/pipeline-monitor-review-policy';
import { isPipelineStrategyReviewGateAfterPhase, PIPELINE_STRATEGY_PHASE_INDEX } from '../../../config/pipeline-phase-policy';
import { createQualityGateByPhaseMap } from '../selectors/quality-gates.selector';
import {
  getGovernanceRefinesForReviewModal,
  getGovernanceSnapshot,
} from '../selectors/governance.selector';

export function usePipelineMonitorController(id: string | undefined) {
  const {
    state: pipelineState,
    loading: pipeLoading,
    error: pipeError,
    pipelineErrorExtras,
    runNextPhaseBusy,
    startPipeline,
    runNextPhase,
    stopPipeline,
    retryPhase,
    approveReview,
    reload: reloadPipeline,
  } = usePipeline(id);
  const { audit, loading: auditLoading } = useAudit(id);
  const { isClient, canManagePlatformSettings } = useProfile();

  const [selectedPhaseId, setSelectedPhaseId] = useState(0);
  const [modalReview, setModalReview] = useState<{ afterPhase: number; label: string } | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [resumeCancelledBusy, setResumeCancelledBusy] = useState(false);
  const [resumeCancelledError, setResumeCancelledError] = useState<string | null>(null);
  const [resumeAutoNextBlockedNotice, setResumeAutoNextBlockedNotice] = useState<{
    code?: string;
    details: unknown;
  } | null>(null);

  const [postReviewRerunPrompt, setPostReviewRerunPrompt] = useState<number[] | null>(null);
  const [postReviewRerunBusy, setPostReviewRerunBusy] = useState(false);
  const postReviewRerunDismissInFlight = useRef(false);
  /** Prevents Dialog `onOpenChange(false)` from duplicating `runNextPhase` after a successful retry-close. */
  const postReviewRerunSuppressDismissRef = useRef(false);

  const clientPortalOk = useClientPortalPipelineGate({
    isClient,
    id,
    auditLoading,
    auditMeta: audit?.meta ?? null,
  });

  const isExpress = selectIsExpressAudit(audit);
  const phases = useMemo(
    () =>
      selectPhaseViews({
        pipelineState,
        audit,
        isExpress,
        isClientPortal: isClient,
      }),
    [pipelineState, audit, isExpress, isClient],
  );
  const selectedPhase = phases.find(phase => phase.id === selectedPhaseId) ?? phases[0];
  const progressPct = selectPipelineProgressPct(phases);

  const reviews = useMemo(() => pipelineState?.reviews || [], [pipelineState]);
  const qualityGateByPhase = useMemo(
    () => createQualityGateByPhaseMap(pipelineState?.events || []),
    [pipelineState?.events],
  );
  const governance = useMemo(
    () => getGovernanceSnapshot(pipelineState ?? null, selectedPhase.id),
    [pipelineState, selectedPhase.id],
  );
  const governanceRefinesForModal = useMemo(
    () => getGovernanceRefinesForReviewModal(pipelineState ?? null, modalReview?.afterPhase ?? null),
    [pipelineState, modalReview],
  );

  const auditStatus = pipelineState?.status || PIPELINE_MONITOR_UI_POLICY.status.created;
  const isCreated = auditStatus === PIPELINE_MONITOR_UI_POLICY.status.created;
  const canStopPipeline = !PIPELINE_MONITOR_UI_POLICY.status.nonStoppable.includes(
    auditStatus as (typeof PIPELINE_MONITOR_UI_POLICY.status.nonStoppable)[number],
  );

  const handlePostReviewContinueWithoutRerun = useCallback(async () => {
    if (postReviewRerunSuppressDismissRef.current) return;
    if (postReviewRerunBusy || postReviewRerunDismissInFlight.current || postReviewRerunPrompt === null) return;
    postReviewRerunDismissInFlight.current = true;
    setPostReviewRerunBusy(true);
    try {
      setPostReviewRerunPrompt(null);
      await runNextPhase();
    } finally {
      setPostReviewRerunBusy(false);
      postReviewRerunDismissInFlight.current = false;
    }
  }, [postReviewRerunBusy, postReviewRerunPrompt, runNextPhase]);

  const handlePostReviewRetrySelectedThenContinue = useCallback(
    async (phaseIds: number[]) => {
      if (postReviewRerunBusy || postReviewRerunPrompt === null || phaseIds.length === 0) return;
      postReviewRerunDismissInFlight.current = true;
      setPostReviewRerunBusy(true);
      postReviewRerunSuppressDismissRef.current = true;
      try {
        for (const p of phaseIds) {
          await retryPhase(p);
        }
        setPostReviewRerunPrompt(null);
        await runNextPhase();
      } finally {
        postReviewRerunSuppressDismissRef.current = false;
        setPostReviewRerunBusy(false);
        postReviewRerunDismissInFlight.current = false;
      }
    },
    [postReviewRerunBusy, postReviewRerunPrompt, retryPhase, runNextPhase],
  );

  async function handleApprove(_id: number, consultantNotes: string, interviewNotes: string) {
    if (!modalReview) return;
    const ok = await approveReview(
      modalReview.afterPhase,
      consultantNotes || undefined,
      interviewNotes || undefined,
    );
    if (!ok) return;
    const afterPhase = modalReview.afterPhase;
    const substantive = reviewNotesMeetSubstantiveMinimum(consultantNotes, interviewNotes);
    setModalReview(null);

    if (isPipelineStrategyReviewGateAfterPhase(afterPhase)) {
      if (substantive) {
        await retryPhase(PIPELINE_STRATEGY_PHASE_INDEX);
      } else {
        await runNextPhase();
      }
      return;
    }

    const selectable = selectableAutoWingDomainPhasesForReviewRerun(audit?.meta ?? null, afterPhase);
    const showRerunPrompt =
      APP_FEATURE_FLAGS.pipelineMonitorPostReviewDomainRerunPromptEnabled &&
      substantive &&
      afterPhase >= 1 &&
      selectable.length > 0;

    if (showRerunPrompt) {
      setPostReviewRerunPrompt(selectable);
      return;
    }

    await runNextPhase();
  }

  async function handleRequestMissingData(_id: number, consultantNotes: string, interviewNotes: string) {
    if (!modalReview) return;
    const ok = await approveReview(
      modalReview.afterPhase,
      consultantNotes || undefined,
      interviewNotes || undefined,
      'request_missing_data',
    );
    if (!ok) return;
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

  async function handleResumeCancelledPlatform() {
    if (!id || resumeCancelledBusy) return;
    setResumeCancelledBusy(true);
    setResumeCancelledError(null);
    setResumeAutoNextBlockedNotice(null);
    try {
      const res = await api.resumePlatformPipelineFromCancelled(id);
      if (res.auto_next_blocked === true) {
        setResumeAutoNextBlockedNotice({
          code: res.auto_next_error_code,
          details: res.auto_next_error_details ?? null,
        });
      } else {
        setResumeAutoNextBlockedNotice(null);
      }
      invalidateAuditRelatedQueries(getGlcQueryClient(), id);
      await reloadPipeline();
    } catch (err) {
      setResumeCancelledError(toUiApiErrorMessage(err));
    } finally {
      setResumeCancelledBusy(false);
    }
  }

  return {
    pipelineState,
    pipeLoading,
    pipeError,
    pipelineErrorExtras,
    runNextPhaseBusy,
    startPipeline,
    runNextPhase,
    retryPhase,
    audit,
    isClient,
    clientPortalOk,
    isExpress,
    phases,
    selectedPhase,
    selectedPhaseId,
    setSelectedPhaseId,
    modalReview,
    setModalReview,
    isStopping,
    stopDialogOpen,
    setStopDialogOpen,
    qualityGateByPhase,
    reviews,
    governance,
    governanceRefinesForModal,
    progressPct,
    auditStatus,
    isCreated,
    canStopPipeline,
    handleApprove,
    handleRequestMissingData,
    handleStopPipeline,
    canManagePlatformSettings,
    resumeCancelledBusy,
    resumeCancelledError,
    resumeAutoNextBlockedNotice,
    handleResumeCancelledPlatform,
    postReviewRerunPrompt,
    postReviewRerunBusy,
    handlePostReviewContinueWithoutRerun,
    handlePostReviewRetrySelectedThenContinue,
    reloadAudit: () => {
      if (!id) return;
      invalidateAuditRelatedQueries(getGlcQueryClient(), id);
    },
    reloadPipeline,
  };
}
