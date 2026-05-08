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
import { PostReviewDomainRerunDialog } from './sections/PostReviewDomainRerunDialog';
import { pipelineHasReconCrawlerTruncationWarning } from '../../lib/pipeline-recon-truncation';
import type { PipelineReview } from './types-pipeline-state';
import { plannedExecutionPhaseIdSet } from '../../lib/audit-execution-plan';
import { deriveAutoWingReviewAfterPhase } from '../../lib/pipeline-monitor-helpers';
import { ExecutionLogPanel } from '../../components/pipeline/ExecutionLogPanel';
import { PIPELINE_UI_COPY } from '../../config/pipeline-ui-copy.en';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../../components/ui/resizable';
import { useIsMobile } from '../../components/ui/use-mobile';
import { cn } from '../../components/ui/utils';
import { APP_FEATURE_FLAGS } from '../../config/app-feature-flags';
import { COALITION_PROTOCOL_COPY } from '../../config/coalition-protocol-copy.en';
import type { PipelineEvent } from '../../data/auditTypes';

function CoalitionStatusStrip({ events }: { events: PipelineEvent[] }) {
  if (!APP_FEATURE_FLAGS.coalitionProtocolEnabled) return null;
  const copy = COALITION_PROTOCOL_COPY.monitor;
  const started = events.some(event => String(event.message ?? '').includes('Coalition protocol shadow block started'));
  const completed = events.some(event => String(event.message ?? '').includes('Coalition protocol shadow block completed'));
  const escalation = events.some(event => event.event_type === 'coalition_conflict_escalation_required');
  const status = completed ? copy.complete : started ? copy.active : copy.pending;
  const items = [copy.contextDirector, copy.hypothesis, copy.alignment, copy.resolver];

  return (
    <section className="mb-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-foreground text-sm font-semibold">{copy.sectionTitle}</h3>
        <span className="rounded-md border px-2 py-1 text-[length:var(--text-2xs)] font-medium text-muted-foreground">
          {escalation ? copy.conflictEscalation : status}
        </span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((label) => (
          <div key={label} className="rounded-lg border bg-background px-3 py-2">
            <p className="text-foreground text-xs font-semibold">{label}</p>
            <p className="text-muted-foreground mt-1 text-[length:var(--text-2xs)]">{status}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PipelineMonitorPage() {
  const { id } = useParams<{ id: string }>();
  const isMobile = useIsMobile();
  const controller = usePipelineMonitorController(id);
  const {
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
    reloadAudit,
    reloadPipeline,
  } = controller;

  const companyName = getPipelineMonitorCompanyName(audit);
  const currentPhaseId = pipelineState?.current_phase ?? -1;
  const failedRetryPhase =
    auditStatus === PIPELINE_MONITOR_UI_POLICY.status.failed && pipelineState != null
      ? pipelineState.current_phase
      : null;

  const autoWingReviewAfterPhase = deriveAutoWingReviewAfterPhase(reviews);
  const coalitionGateActive =
    APP_FEATURE_FLAGS.coalitionProtocolEnabled &&
    APP_FEATURE_FLAGS.coalitionProtocolRolloutMode !== 'shadow';
  const openReviewModal = (afterPhase: number, label: string) => setModalReview({
    afterPhase,
    label: coalitionGateActive && afterPhase === 0
      ? COALITION_PROTOCOL_COPY.gate.approveCoalitionTitle
      : label,
  });

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
          currentPhaseId={currentPhaseId}
          phases={phases}
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
                pipelineErrorExtras={pipelineErrorExtras}
                isCreated={isCreated}
                isClient={isClient}
                isExpress={isExpress}
                recon={audit?.recon ?? null}
                showReconCrawlerTruncationWarning={pipelineHasReconCrawlerTruncationWarning(pipelineState?.events ?? [])}
                auditId={id}
                governance={governance}
                auditStatus={auditStatus}
                canManagePlatformSettings={canManagePlatformSettings}
                canStopPipeline={canStopPipeline}
                isStopping={isStopping}
                resumeCancelledBusy={resumeCancelledBusy}
                resumeCancelledError={resumeCancelledError}
                resumeAutoNextBlockedNotice={resumeAutoNextBlockedNotice}
                onOpenStopDialog={() => setStopDialogOpen(true)}
                onResumeCancelledPlatform={handleResumeCancelledPlatform}
                onStartPipeline={startPipeline}
                onRunNextPhase={runNextPhase}
                runNextPhaseBusy={runNextPhaseBusy}
                onRetryPhase={retryPhase}
                audit={audit}
                onRefreshAfterPhaseEdit={async () => {
                  reloadAudit();
                  await reloadPipeline();
                }}
                onTokenBudgetTopupSuccess={async () => {
                  reloadAudit();
                  await reloadPipeline();
                }}
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
                onOpenReviewModal={openReviewModal}
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
                onOpenReviewModal={openReviewModal}
              />
              <PhaseDetailPanel
                selectedPhase={selectedPhase}
                phases={phases}
                plannedExecutionPhaseIds={plannedExecutionPhaseIds}
                pipelineState={pipelineState}
                pipeError={pipeError}
                pipelineErrorExtras={pipelineErrorExtras}
                isCreated={isCreated}
                isClient={isClient}
                isExpress={isExpress}
                recon={audit?.recon ?? null}
                showReconCrawlerTruncationWarning={pipelineHasReconCrawlerTruncationWarning(pipelineState?.events ?? [])}
                auditId={id}
                governance={governance}
                auditStatus={auditStatus}
                canManagePlatformSettings={canManagePlatformSettings}
                canStopPipeline={canStopPipeline}
                isStopping={isStopping}
                resumeCancelledBusy={resumeCancelledBusy}
                resumeCancelledError={resumeCancelledError}
                resumeAutoNextBlockedNotice={resumeAutoNextBlockedNotice}
                onOpenStopDialog={() => setStopDialogOpen(true)}
                onResumeCancelledPlatform={handleResumeCancelledPlatform}
                onStartPipeline={startPipeline}
                onRunNextPhase={runNextPhase}
                runNextPhaseBusy={runNextPhaseBusy}
                onRetryPhase={retryPhase}
                audit={audit}
                onRefreshAfterPhaseEdit={async () => {
                  reloadAudit();
                  await reloadPipeline();
                }}
                onTokenBudgetTopupSuccess={async () => {
                  reloadAudit();
                  await reloadPipeline();
                }}
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
              onOpenReviewModal={openReviewModal}
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
              pipelineErrorExtras={pipelineErrorExtras}
              isCreated={isCreated}
              isClient={isClient}
              isExpress={isExpress}
              recon={audit?.recon ?? null}
              showReconCrawlerTruncationWarning={pipelineHasReconCrawlerTruncationWarning(pipelineState?.events ?? [])}
              auditId={id}
              governance={governance}
              auditStatus={auditStatus}
              canManagePlatformSettings={canManagePlatformSettings}
              canStopPipeline={canStopPipeline}
              isStopping={isStopping}
              resumeCancelledBusy={resumeCancelledBusy}
              resumeCancelledError={resumeCancelledError}
              resumeAutoNextBlockedNotice={resumeAutoNextBlockedNotice}
              onOpenStopDialog={() => setStopDialogOpen(true)}
              onResumeCancelledPlatform={handleResumeCancelledPlatform}
              onStartPipeline={startPipeline}
              onRunNextPhase={runNextPhase}
              runNextPhaseBusy={runNextPhaseBusy}
              onRetryPhase={retryPhase}
              audit={audit}
              onRefreshAfterPhaseEdit={async () => {
                reloadAudit();
                await reloadPipeline();
              }}
              onTokenBudgetTopupSuccess={async () => {
                reloadAudit();
                await reloadPipeline();
              }}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
      <div className="mt-4">
        <CoalitionStatusStrip events={pipelineState?.events ?? []} />
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
        clientSituationSnapshot={
          coalitionGateActive && modalReview?.afterPhase === 0
            ? audit?.coalition?.client_situation_snapshot ?? null
            : null
        }
      />

      <StopPipelineDialog
        open={stopDialogOpen}
        isStopping={isStopping}
        onOpenChange={setStopDialogOpen}
        onConfirmStop={handleStopPipeline}
      />

      <PostReviewDomainRerunDialog
        open={!isClient && postReviewRerunPrompt !== null}
        selectablePhaseIds={postReviewRerunPrompt ?? []}
        busy={postReviewRerunBusy || runNextPhaseBusy}
        onDismissContinue={handlePostReviewContinueWithoutRerun}
        onRetrySelectedPhases={handlePostReviewRetrySelectedThenContinue}
      />
    </AppShell>
  );
}
