import { ArrowsClockwise } from '@phosphor-icons/react';
import { useMemo } from 'react';
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
import { plannedExecutionPhaseIdSet } from '../../lib/audit-execution-plan';
import { deriveAutoWingReviewAfterPhase } from '../../lib/pipeline-monitor-helpers';
import { ExecutionLogPanel } from '../../components/pipeline/ExecutionLogPanel';
import { PIPELINE_UI_COPY } from '../../config/pipeline-ui-copy.en';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../../components/ui/resizable';
import { useIsMobile } from '../../components/ui/use-mobile';
import { cn } from '../../components/ui/utils';

export function PipelineMonitorPage() {
  const { id } = useParams<{ id: string }>();
  const isMobile = useIsMobile();
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
    handleRequestMissingData,
    handleStopPipeline,
    canManagePlatformSettings,
    resumeCancelledBusy,
    resumeCancelledError,
    handleResumeCancelledPlatform,
  } = controller;

  const companyName = getPipelineMonitorCompanyName(audit);
  const currentPhaseId = pipelineState?.current_phase ?? -1;
  const failedRetryPhase =
    auditStatus === PIPELINE_MONITOR_UI_POLICY.status.failed && pipelineState != null
      ? pipelineState.current_phase
      : null;

  const autoWingReviewAfterPhase = deriveAutoWingReviewAfterPhase(reviews);

  const plannedExecutionPhaseIds = useMemo(
    () => (audit?.meta ? plannedExecutionPhaseIdSet(audit.meta) : null),
    [audit?.meta],
  );

  const reviewByPhase = new Map<number, PipelineReview>([
    [0, selectReviewForPhase(reviews, 0)],
    [autoWingReviewAfterPhase, selectReviewForPhase(reviews, autoWingReviewAfterPhase)],
    [7, selectReviewForPhase(reviews, 7)],
  ]);

  const reviewWarningsByPhase = new Map<number, boolean>([
    [0, hasQualityWarnings(qualityGateByPhase.get(0))],
    [autoWingReviewAfterPhase, hasQualityWarnings(qualityGateByPhase.get(autoWingReviewAfterPhase))],
    [7, hasQualityWarnings(qualityGateByPhase.get(7))],
  ]);

  if (pipeLoading && !pipelineState) {
    return (
      <AppShell title={isClient ? PM.clientPortal.pageTitle : PM.pageTitle} subtitle={PM.loading}>
        <div className={`flex items-center justify-center ${PIPELINE_MONITOR_UI_POLICY.layout.loaderHeightClassName}`}>
          <ArrowsClockwise className="h-6 w-6 animate-spin text-[var(--glc-blue)]" />
        </div>
      </AppShell>
    );
  }

  if (isClient && clientPortalOk === 'pending' && id) {
    return (
      <AppShell title={PM.clientPortal.pageTitle} subtitle={PM.loading}>
        <div className={`flex items-center justify-center ${PIPELINE_MONITOR_UI_POLICY.layout.loaderHeightClassName}`}>
          <ArrowsClockwise className="h-6 w-6 animate-spin text-[var(--glc-blue)]" />
        </div>
      </AppShell>
    );
  }

  if (isClient && clientPortalOk === false && id) {
    return <Navigate to={`/portal/audit/${id}`} replace />;
  }

  const shellTitle = isClient ? PM.clientPortal.pageTitle : PM.pageTitle;
  const shellSubtitle = isClient
    ? `${companyName} · ${PM.clientPortal.auditRefPrefix} ${id?.slice(0, 8) ?? ''}`.trim()
    : `${companyName} · ${PM.auditIdPrefix}${id?.slice(0, 8) ?? ''}`;

  return (
    <AppShell
      title={shellTitle}
      subtitle={shellSubtitle}
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
      {isMobile ? (
        <div
          className={cn(
            'flex min-h-0',
            PIPELINE_MONITOR_UI_POLICY.layout.contentClassName,
            isClient && 'flex-col',
          )}
        >
          {isClient ? (
            <>
              <PhaseDetailPanel
                selectedPhase={selectedPhase}
                phases={phases}
                plannedExecutionPhaseIds={plannedExecutionPhaseIds}
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
              <PhaseSidebar
                phases={phases}
                selectedPhaseId={selectedPhaseId}
                isExpress={isExpress}
                isClient={isClient}
                currentPhaseId={currentPhaseId}
                stackedBelowDetail
                reviewByPhase={reviewByPhase}
                autoWingReviewAfterPhase={autoWingReviewAfterPhase}
                reviewWarningsByPhase={reviewWarningsByPhase}
                onSelectPhase={setSelectedPhaseId}
                onOpenReviewModal={(afterPhase, label) => setModalReview({ afterPhase, label })}
              />
            </>
          ) : (
            <>
              <PhaseSidebar
                phases={phases}
                selectedPhaseId={selectedPhaseId}
                isExpress={isExpress}
                isClient={isClient}
                currentPhaseId={currentPhaseId}
                reviewByPhase={reviewByPhase}
                autoWingReviewAfterPhase={autoWingReviewAfterPhase}
                reviewWarningsByPhase={reviewWarningsByPhase}
                onSelectPhase={setSelectedPhaseId}
                onOpenReviewModal={(afterPhase, label) => setModalReview({ afterPhase, label })}
              />
              <PhaseDetailPanel
                selectedPhase={selectedPhase}
                phases={phases}
                plannedExecutionPhaseIds={plannedExecutionPhaseIds}
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
            </>
          )}
        </div>
      ) : (
        <ResizablePanelGroup
          direction="horizontal"
          className={cn('min-h-0', PIPELINE_MONITOR_UI_POLICY.layout.contentClassName)}
          autoSaveId={PIPELINE_MONITOR_UI_POLICY.layout.sidebarLayoutAutoSaveId}
        >
          <ResizablePanel
            id="pipeline-monitor-sidebar"
            order={1}
            defaultSize={PIPELINE_MONITOR_UI_POLICY.layout.sidebarPanelDefaultSizePct}
            minSize={PIPELINE_MONITOR_UI_POLICY.layout.sidebarPanelMinSizePct}
            maxSize={PIPELINE_MONITOR_UI_POLICY.layout.sidebarPanelMaxSizePct}
            className="min-w-0 min-h-0"
          >
            <PhaseSidebar
              phases={phases}
              selectedPhaseId={selectedPhaseId}
              isExpress={isExpress}
              isClient={isClient}
              currentPhaseId={currentPhaseId}
              resizableLayout
              reviewByPhase={reviewByPhase}
              autoWingReviewAfterPhase={autoWingReviewAfterPhase}
              reviewWarningsByPhase={reviewWarningsByPhase}
              onSelectPhase={setSelectedPhaseId}
              onOpenReviewModal={(afterPhase, label) => setModalReview({ afterPhase, label })}
            />
          </ResizablePanel>
          <ResizableHandle
            aria-label={isClient ? PM.clientPortal.sidebar.resizeHandle : PM.sidebar.resizeHandle}
            title={isClient ? PM.clientPortal.sidebar.resizeHint : PM.sidebar.resizeHint}
            className="w-1.5 bg-[var(--border-subtle)] after:w-1.5"
          />
          <ResizablePanel
            id="pipeline-monitor-detail"
            order={2}
            defaultSize={100 - PIPELINE_MONITOR_UI_POLICY.layout.sidebarPanelDefaultSizePct}
            minSize={PIPELINE_MONITOR_UI_POLICY.layout.detailPanelMinSizePct}
            className="min-w-0 min-h-0"
          >
            <PhaseDetailPanel
              selectedPhase={selectedPhase}
              phases={phases}
              plannedExecutionPhaseIds={plannedExecutionPhaseIds}
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
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
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
        onRequestMissingData={handleRequestMissingData}
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
