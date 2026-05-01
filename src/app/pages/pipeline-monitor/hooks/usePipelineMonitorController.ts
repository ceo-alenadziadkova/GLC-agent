import { useMemo, useState } from 'react';
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
import {
  hasNonEmptyReviewNotesForRerun,
  isPipelineStrategyReviewGateAfterPhase,
  PIPELINE_STRATEGY_PHASE_INDEX,
} from '../../../config/pipeline-phase-policy';
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

  async function handleApprove(_id: number, consultantNotes: string, interviewNotes: string) {
    if (!modalReview) return;
    const ok = await approveReview(
      modalReview.afterPhase,
      consultantNotes || undefined,
      interviewNotes || undefined,
    );
    if (!ok) return;
    const afterPhase = modalReview.afterPhase;
    const shouldRerunStrategy =
      isPipelineStrategyReviewGateAfterPhase(afterPhase) &&
      hasNonEmptyReviewNotesForRerun(consultantNotes, interviewNotes);
    setModalReview(null);
    if (shouldRerunStrategy) {
      await retryPhase(PIPELINE_STRATEGY_PHASE_INDEX);
    } else {
      await runNextPhase();
    }
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
    try {
      await api.resumePlatformPipelineFromCancelled(id);
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
    handleResumeCancelledPlatform,
  };
}
