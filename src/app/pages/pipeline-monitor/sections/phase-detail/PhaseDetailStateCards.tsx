import { ArrowsClockwise, Clock, Info, WarningCircle } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { Callout } from '../../../../../design-system/ui';
import { ReconReviewSummary } from '../../../../components/glc/ReconReviewSummary';
import { SectionLabel } from '../../../../components/glc/SectionLabel';
import { PIPELINE_MONITOR_COPY as PM } from '../../../../config/pipeline-monitor-copy';
import { PIPELINE_MONITOR_UI_POLICY } from '../../config/pipeline-monitor-ui-policy';
import type { ReconData } from '../../../../data/auditTypes';
import type { PhaseView } from '../../types';
import type { PipelineReview, PipelineStateLite } from '../../types-pipeline-state';
import type { PhaseDetailCopy } from './phase-detail-types';

type Props = {
  selectedPhase: PhaseView;
  isClient: boolean;
  isCreated: boolean;
  recon: ReconData | null;
  showReconCrawlerTruncationWarning: boolean;
  isSkippedForCoveragePlan: boolean;
  blockingPendingReview: PipelineReview | null | undefined;
  upstreamOrchestratorBusy: boolean;
  auditStatus: string;
  pipelineState: PipelineStateLite | null;
  onRetryPhase: (phase: number, opts?: { retry_comment?: string }) => void | Promise<void>;
  detailCopy: PhaseDetailCopy;
};

export function PhaseDetailStateCards(props: Props) {
  const {
    selectedPhase,
    isClient,
    isCreated,
    recon,
    showReconCrawlerTruncationWarning,
    isSkippedForCoveragePlan,
    blockingPendingReview,
    upstreamOrchestratorBusy,
    auditStatus,
    pipelineState,
    onRetryPhase,
    detailCopy,
  } = props;

  return (
    <>
      {selectedPhase.id === 0 && !isClient && !isCreated ? (
        <div className="space-y-3">
          <SectionLabel>{detailCopy.reconPreviewSectionTitle}</SectionLabel>
          <ReconReviewSummary
            recon={recon}
            showCrawlerTruncationWarning={showReconCrawlerTruncationWarning}
            copy={{
              ...PM.reviewModal.recon,
              introTitle: detailCopy.reconPreviewIntroTitle,
              introBody: detailCopy.reconPreviewIntroBody,
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
            <span className="text-info text-sm font-semibold">{detailCopy.agentRunning}</span>
          </div>
          <div className="bg-info/20 h-1 overflow-hidden rounded-full">
            <motion.div
              className="h-full rounded-full bg-[var(--gradient-brand)] shadow-[var(--glow-blue-sm)]"
              initial={{ width: '20%' }}
              animate={{ width: '75%' }}
              transition={{
                duration: PIPELINE_MONITOR_UI_POLICY.animation.runningBarDurationSec,
                ease: 'easeInOut',
                repeat: Infinity,
                repeatType: 'mirror',
              }}
            />
          </div>
        </motion.div>
      )}

      {selectedPhase.status === 'skipped' && (
        <div className="glc-card rounded-xl border-dashed p-10 text-center">
          <Info className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
          <p className="text-foreground text-sm font-medium">
            {isSkippedForCoveragePlan ? detailCopy.phaseSkippedCoverageTitle : detailCopy.phaseSkippedBundleTitle}
          </p>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-xs leading-relaxed">
            {isSkippedForCoveragePlan ? detailCopy.phaseSkippedCoverageSubtitle : detailCopy.phaseSkippedBundleSubtitle}
          </p>
        </div>
      )}

      {selectedPhase.status === 'pending' && (
        <div className="glc-card rounded-xl border-dashed p-10 text-center">
          {auditStatus === PIPELINE_MONITOR_UI_POLICY.status.failed ? (
            <>
              <WarningCircle className="text-destructive mx-auto mb-3 h-8 w-8" />
              <p className="text-foreground text-sm font-medium">{detailCopy.pipelineFailedPendingTitle}</p>
              <p className="text-muted-foreground mx-auto mt-2 max-w-md text-xs leading-relaxed">
                {detailCopy.pipelineFailedPendingSubtitle}
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
          ) : blockingPendingReview ? (
            <>
              <Clock className="text-warning mx-auto mb-3 h-8 w-8" />
              <p className="text-foreground text-sm font-medium">{detailCopy.waitingBlockedByReviewTitle}</p>
              <p className="text-muted-foreground mx-auto mt-2 max-w-md text-xs leading-relaxed">
                {detailCopy.waitingBlockedByReviewSubtitle}
              </p>
            </>
          ) : upstreamOrchestratorBusy ? (
            <>
              <ArrowsClockwise className="text-info mx-auto mb-3 h-8 w-8 animate-spin" />
              <p className="text-foreground text-sm font-medium">{detailCopy.waitingUpstreamActiveTitle}</p>
              <p className="text-muted-foreground mx-auto mt-2 max-w-md text-xs leading-relaxed">
                {detailCopy.waitingUpstreamActiveSubtitle}
              </p>
            </>
          ) : (
            <>
              <Clock className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
              <p className="text-muted-foreground text-sm font-medium">{detailCopy.waitingTitle}</p>
              <p className="text-muted-foreground mt-1 text-xs">{detailCopy.waitingSubtitle}</p>
            </>
          )}
        </div>
      )}

      {selectedPhase.status === PIPELINE_MONITOR_UI_POLICY.status.failed && (
        <Callout intent="danger" className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <WarningCircle className="text-destructive h-4 w-4 flex-shrink-0" />
            <span className="text-destructive text-sm font-semibold">{PM.detail.domainUnavailableTitle}</span>
          </div>
          <p className="text-muted-foreground ml-6 text-xs">{PM.detail.domainUnavailableBody}</p>
        </Callout>
      )}
    </>
  );
}
