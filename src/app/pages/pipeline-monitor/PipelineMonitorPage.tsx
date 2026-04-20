import { ArrowsClockwise } from '@phosphor-icons/react';
import { Navigate, useParams } from 'react-router';
import { AppShell } from '../../components/AppShell';
import { ReviewPointModal } from '../../components/glc/ReviewPointModal';
import { PIPELINE_MONITOR_COPY as PM } from '../../config/pipeline-monitor-copy';
import { hasQualityWarnings } from './selectors/quality-gates.selector';
import { selectReviewForPhase } from './selectors/phase-view.selector';
import { getPipelineMonitorCompanyName } from './utils/pipeline-monitor-format';
import { usePipelineMonitorController } from './hooks/usePipelineMonitorController';
import { PIPELINE_MONITOR_UI_POLICY } from './config/pipeline-monitor-ui-policy';
import { MonitorHeaderActions } from './sections/MonitorHeaderActions';
import { PhaseSidebar } from './sections/PhaseSidebar';
import { PhaseDetailPanel } from './sections/PhaseDetailPanel';
import { StopPipelineDialog } from './sections/StopPipelineDialog';
import { pipelineHasReconCrawlerTruncationWarning } from '../../lib/pipeline-recon-truncation';
import type { PipelineReview } from './types-pipeline-state';
import { ExecutionLogPanel } from '../../components/pipeline/ExecutionLogPanel';
import { PIPELINE_UI_COPY } from '../../config/pipeline-ui-copy.en';

export function PipelineMonitorPage() {
  const { id } = useParams<{ id: string }>();
  const controller = usePipelineMonitorController(id);
  const {
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
    handleStopPipeline,
    canManagePlatformSettings,
    resumeCancelledBusy,
    resumeCancelledError,
    handleResumeCancelledPlatform,
  } = controller;

  const companyName = getPipelineMonitorCompanyName(audit);
  const failedRetryPhase =
    auditStatus === PIPELINE_MONITOR_UI_POLICY.status.failed && pipelineState != null
      ? pipelineState.current_phase
      : null;

  const reviewByPhase = new Map<number, PipelineReview>([
    [0, selectReviewForPhase(reviews, 0)],
    [4, selectReviewForPhase(reviews, 4)],
    [7, selectReviewForPhase(reviews, 7)],
  ]);

  const reviewWarningsByPhase = new Map<number, boolean>([
    [0, hasQualityWarnings(qualityGateByPhase.get(0))],
    [4, hasQualityWarnings(qualityGateByPhase.get(4))],
    [7, hasQualityWarnings(qualityGateByPhase.get(7))],
  ]);

  if (pipeLoading && !pipelineState) {
    return (
      <AppShell title={PM.pageTitle} subtitle={PM.loading}>
        <div className={`flex items-center justify-center ${PIPELINE_MONITOR_UI_POLICY.layout.loaderHeightClassName}`}>
          <ArrowsClockwise className="h-6 w-6 animate-spin text-[var(--glc-blue)]" />
        </div>
      </AppShell>
    );
  }

  if (isClient && clientPortalOk === 'pending' && id) {
    return (
      <AppShell title={PM.pageTitle} subtitle={PM.loading}>
        <div className={`flex items-center justify-center ${PIPELINE_MONITOR_UI_POLICY.layout.loaderHeightClassName}`}>
          <ArrowsClockwise className="h-6 w-6 animate-spin text-[var(--glc-blue)]" />
        </div>
      </AppShell>
    );
  }

  if (isClient && clientPortalOk === false && id) {
    return <Navigate to={`/portal/audit/${id}`} replace />;
  }

  return (
    <AppShell
      title={PM.pageTitle}
      subtitle={`${companyName} · ${PM.auditIdPrefix}${id?.slice(0, 8) ?? ''}`}
      actions={
        <MonitorHeaderActions
          isExpress={isExpress}
          progressPct={progressPct}
          auditStatus={auditStatus}
          canStopPipeline={canStopPipeline}
          isStopping={isStopping}
          onOpenStopDialog={() => setStopDialogOpen(true)}
          isClient={isClient}
          failedRetryPhase={failedRetryPhase}
          onRetryFailedPhase={retryPhase}
        />
      }
    >
      <div className={`flex ${PIPELINE_MONITOR_UI_POLICY.layout.contentClassName}`}>
        <PhaseSidebar
          phases={phases}
          selectedPhaseId={selectedPhaseId}
          isExpress={isExpress}
          isClient={isClient}
          reviewByPhase={reviewByPhase}
          reviewWarningsByPhase={reviewWarningsByPhase}
          onSelectPhase={setSelectedPhaseId}
          onOpenReviewModal={(afterPhase, label) => setModalReview({ afterPhase, label })}
        />
        <PhaseDetailPanel
          selectedPhase={selectedPhase}
          phases={phases}
          pipelineState={pipelineState}
          pipeError={pipeError}
          isCreated={isCreated}
          isClient={isClient}
          isExpress={isExpress}
          recon={audit?.recon ?? null}
          showReconCrawlerTruncationWarning={pipelineHasReconCrawlerTruncationWarning(pipelineState?.events ?? [])}
          auditId={id}
          governance={governance}
          auditStatus={auditStatus}
          canManagePlatformSettings={canManagePlatformSettings}
          resumeCancelledBusy={resumeCancelledBusy}
          resumeCancelledError={resumeCancelledError}
          onResumeCancelledPlatform={handleResumeCancelledPlatform}
          onStartPipeline={startPipeline}
          onRunNextPhase={runNextPhase}
          runNextPhaseBusy={runNextPhaseBusy}
          onRetryPhase={retryPhase}
        />
      </div>
      <div className="mt-4">
        <ExecutionLogPanel auditId={id} title={PIPELINE_UI_COPY.executionLogTitles.pipelineMonitor} />
      </div>

      <ReviewPointModal
        open={!isClient && modalReview !== null}
        reviewPoint={
          modalReview
            ? { id: modalReview.afterPhase, label: modalReview.label, note: PM.reviewModal.defaultNote, after: modalReview.afterPhase }
            : null
        }
        onClose={() => setModalReview(null)}
        onApprove={handleApprove}
        qualityGate={modalReview ? qualityGateByPhase.get(modalReview.afterPhase) ?? null : null}
        governanceRefines={governanceRefinesForModal}
        governanceRefineSectionTitle={PM.reviewModal.governanceRefineSectionTitle}
        governanceRefineSectionIntro={PM.reviewModal.governanceRefineSectionIntro}
        reconReviewSummary={
          modalReview?.afterPhase === 0
            ? {
                recon: audit?.recon ?? null,
                copy: PM.reviewModal.recon,
                showCrawlerTruncationWarning: pipelineHasReconCrawlerTruncationWarning(pipelineState?.events ?? []),
              }
            : null
        }
      />

      <StopPipelineDialog
        open={stopDialogOpen}
        isStopping={isStopping}
        onOpenChange={setStopDialogOpen}
        onConfirmStop={handleStopPipeline}
      />
    </AppShell>
  );
}
