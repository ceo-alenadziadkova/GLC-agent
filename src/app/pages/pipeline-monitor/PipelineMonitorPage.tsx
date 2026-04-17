import { ArrowsClockwise } from '@phosphor-icons/react';
import { Navigate, useParams } from 'react-router';
import { AppShell } from '../../components/AppShell';
import { ReviewPointModal } from '../../components/glc/ReviewPointModal';
import { PIPELINE_MONITOR_COPY as PM } from '../../config/pipeline-monitor-copy';
import { hasQualityWarnings } from './selectors/quality-gates.selector';
import { selectReviewForPhase } from './selectors/phase-view.selector';
import { getPipelineMonitorCompanyName, getWorkspacePath } from './utils/pipeline-monitor-format';
import { usePipelineMonitorController } from './hooks/usePipelineMonitorController';
import { PIPELINE_MONITOR_UI_POLICY } from './config/pipeline-monitor-ui-policy';
import { MonitorHeaderActions } from './sections/MonitorHeaderActions';
import { PhaseSidebar } from './sections/PhaseSidebar';
import { PhaseDetailPanel } from './sections/PhaseDetailPanel';
import { StopPipelineDialog } from './sections/StopPipelineDialog';

export function PipelineMonitorPage() {
  const { id } = useParams<{ id: string }>();
  const controller = usePipelineMonitorController(id);
  const {
    pipelineState,
    pipeLoading,
    pipeError,
    startPipeline,
    runNextPhase,
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
  } = controller;

  const companyName = getPipelineMonitorCompanyName(audit);
  const workspacePath = getWorkspacePath(id, isClient);

  const reviewStatusByPhase = new Map<number, { status: string }>([
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
          <ArrowsClockwise className="w-6 h-6 animate-spin" style={{ color: 'var(--glc-blue)' }} />
        </div>
      </AppShell>
    );
  }

  if (isClient && clientPortalOk === 'pending' && id) {
    return (
      <AppShell title={PM.pageTitle} subtitle={PM.loading}>
        <div className={`flex items-center justify-center ${PIPELINE_MONITOR_UI_POLICY.layout.loaderHeightClassName}`}>
          <ArrowsClockwise className="w-6 h-6 animate-spin" style={{ color: 'var(--glc-blue)' }} />
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
        />
      }
    >
      <div className="flex" style={{ height: PIPELINE_MONITOR_UI_POLICY.layout.contentHeight }}>
        <PhaseSidebar
          phases={phases}
          selectedPhaseId={selectedPhaseId}
          isExpress={isExpress}
          isClient={isClient}
          reviewStatusByPhase={reviewStatusByPhase}
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
          workspacePath={workspacePath}
          governance={governance}
          onStartPipeline={startPipeline}
          onRunNextPhase={runNextPhase}
        />
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
