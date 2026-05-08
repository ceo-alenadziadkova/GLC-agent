import { Link } from 'react-router';
import { ArrowsClockwise, CaretRight, CircleNotch, Play } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { Button } from '../../../../components/ui/button';
import { PIPELINE_RETRY_COMMENT_MAX_LENGTH } from '../../../../config/api-paths';
import { SectionLabel } from '../../../../components/glc/SectionLabel';
import { ScoreBadge } from '../../../../components/glc/ScoreBadge';
import { PIPELINE_MONITOR_UI_POLICY } from '../../config/pipeline-monitor-ui-policy';
import { cn } from '../../../../components/ui/utils';
import type { PhaseView } from '../../types';
import type { PhaseDetailCopy } from './phase-detail-types';
import { PIPELINE_RETRY_COMMENT_WARNING_THRESHOLD } from './phase-detail-helpers';

type Props = {
  selectedPhase: PhaseView;
  phaseHasAgentOutput: boolean;
  canEditPhaseResult: boolean;
  showPhaseResultLink: boolean;
  phaseResultPath: string;
  phaseResultLinkLabel: string;
  canManualRerunPhase: boolean;
  showContinuePipeline: boolean;
  runNextPhaseBusy: boolean;
  resumeCancelledBusy: boolean;
  isClient: boolean;
  rerunCommentDraft: string;
  setRerunCommentDraft: (value: string) => void;
  onOpenPhaseResultEditor: () => void;
  onRetryPhase: (phase: number, opts?: { retry_comment?: string }) => void | Promise<void>;
  onRunNextPhase: () => void;
  editorOpenCta: string;
  detailCopy: PhaseDetailCopy;
};

export function PhaseDetailActions(props: Props) {
  const {
    selectedPhase,
    phaseHasAgentOutput,
    canEditPhaseResult,
    showPhaseResultLink,
    phaseResultPath,
    phaseResultLinkLabel,
    canManualRerunPhase,
    showContinuePipeline,
    runNextPhaseBusy,
    resumeCancelledBusy,
    isClient,
    rerunCommentDraft,
    setRerunCommentDraft,
    onOpenPhaseResultEditor,
    onRetryPhase,
    onRunNextPhase,
    editorOpenCta,
    detailCopy,
  } = props;

  const rerunCommentLength = rerunCommentDraft.length;
  const rerunCommentCounterClassName =
    rerunCommentLength >= PIPELINE_RETRY_COMMENT_MAX_LENGTH
      ? 'text-destructive'
      : rerunCommentLength >= PIPELINE_RETRY_COMMENT_WARNING_THRESHOLD
        ? 'text-warning'
        : 'text-muted-foreground';

  return (
    <>
      {phaseHasAgentOutput && selectedPhase.score !== null && (
        <div className="glc-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>{detailCopy.domainScore}</SectionLabel>
            <ScoreBadge score={selectedPhase.score} showLabel size="lg" />
          </div>
        </div>
      )}

      {!isClient &&
        (selectedPhase.status === PIPELINE_MONITOR_UI_POLICY.status.failed || canManualRerunPhase) && (
          <div className="space-y-1">
            <label className="text-muted-foreground block text-xs" htmlFor="phase-rerun-comment-inline">
              {detailCopy.retryCommentLabel}
            </label>
            <textarea
              id="phase-rerun-comment-inline"
              className="w-full min-h-[length:var(--pipeline-monitor-retry-comment-min-height)] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 text-xs"
              value={rerunCommentDraft}
              maxLength={PIPELINE_RETRY_COMMENT_MAX_LENGTH}
              onChange={(event) => setRerunCommentDraft(event.target.value)}
              placeholder={detailCopy.retryCommentPlaceholder}
            />
            <p className={cn('text-right text-[length:var(--text-xs)]', rerunCommentCounterClassName)} aria-live="polite">
              {rerunCommentLength}/{PIPELINE_RETRY_COMMENT_MAX_LENGTH}
            </p>
          </div>
        )}

      <div className="flex items-center gap-3">
        {canEditPhaseResult && (
          <Button type="button" variant="outline" size="sm" onClick={onOpenPhaseResultEditor}>
            {editorOpenCta}
          </Button>
        )}
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
            onClick={() =>
              void onRetryPhase(selectedPhase.id, {
                retry_comment: rerunCommentDraft.trim() || undefined,
              })
            }
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
          >
            <ArrowsClockwise className="w-4 h-4" /> {detailCopy.retryFailedPhase}
          </motion.button>
        )}
        {selectedPhase.status !== PIPELINE_MONITOR_UI_POLICY.status.failed && canManualRerunPhase && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={resumeCancelledBusy || runNextPhaseBusy}
            title={detailCopy.rerunPhaseManualHint}
            onClick={() =>
              void onRetryPhase(selectedPhase.id, {
                retry_comment: rerunCommentDraft.trim() || undefined,
              })
            }
          >
            <ArrowsClockwise className="mr-2 h-4 w-4" aria-hidden />
            {detailCopy.rerunPhaseManual}
          </Button>
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
                {detailCopy.continuePipelineBusy}
              </>
            ) : (
              <>
                <Play className="w-4 h-4" aria-hidden />
                {detailCopy.continuePipeline}
              </>
            )}
          </motion.button>
        )}
      </div>
    </>
  );
}
