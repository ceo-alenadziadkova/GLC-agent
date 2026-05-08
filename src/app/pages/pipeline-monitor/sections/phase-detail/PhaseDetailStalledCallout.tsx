import { ArrowsClockwise, X } from '@phosphor-icons/react';
import { Callout } from '../../../../../design-system/ui';
import { Button } from '../../../../components/ui/button';
import { PIPELINE_RETRY_COMMENT_MAX_LENGTH } from '../../../../config/api-paths';
import { PIPELINE_MONITOR_UI_POLICY } from '../../config/pipeline-monitor-ui-policy';
import { cn } from '../../../../components/ui/utils';
import type { PhaseView } from '../../types';
import type { PhaseDetailCopy } from './phase-detail-types';
import { PIPELINE_RETRY_COMMENT_WARNING_THRESHOLD } from './phase-detail-helpers';

type Props = {
  selectedPhase: PhaseView;
  selectedPhaseStalled: boolean;
  selectedPhaseTimedOutWithoutActivity: boolean;
  isClient: boolean;
  canStopPipeline: boolean;
  isStopping: boolean;
  canManualRerunPhase: boolean;
  rerunCommentDraft: string;
  setRerunCommentDraft: (value: string) => void;
  onOpenStopDialog: () => void;
  onRetryPhase: (phase: number, opts?: { retry_comment?: string }) => void | Promise<void>;
  detailCopy: PhaseDetailCopy;
};

export function PhaseDetailStalledCallout(props: Props) {
  const {
    selectedPhase,
    selectedPhaseStalled,
    selectedPhaseTimedOutWithoutActivity,
    isClient,
    canStopPipeline,
    isStopping,
    canManualRerunPhase,
    rerunCommentDraft,
    setRerunCommentDraft,
    onOpenStopDialog,
    onRetryPhase,
    detailCopy,
  } = props;

  if (!(selectedPhaseStalled || selectedPhaseTimedOutWithoutActivity) || isClient) return null;

  const rerunCommentLength = rerunCommentDraft.length;
  const rerunCommentCounterClassName =
    rerunCommentLength >= PIPELINE_RETRY_COMMENT_MAX_LENGTH
      ? 'text-destructive'
      : rerunCommentLength >= PIPELINE_RETRY_COMMENT_WARNING_THRESHOLD
        ? 'text-warning'
        : 'text-muted-foreground';

  return (
    <Callout intent="warning" className="p-4" title={detailCopy.phaseStalledTitle}>
      <>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {selectedPhaseStalled
            ? detailCopy.phaseStalledBody
            : detailCopy.phaseStalledBodyTimeoutFallback.replace(
                '{minutes}',
                String(PIPELINE_MONITOR_UI_POLICY.resilience.stalledPhaseWarningTimeoutMin),
              )}
        </p>
        <div className="mt-3 space-y-1">
          <label className="text-muted-foreground block text-xs" htmlFor="phase-rerun-comment">
            {detailCopy.retryCommentLabel}
          </label>
          <textarea
            id="phase-rerun-comment"
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
        <div className="mt-3 flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={!canStopPipeline || isStopping} onClick={onOpenStopDialog}>
            {isStopping ? (
              <>
                <ArrowsClockwise className="w-4 h-4 animate-spin" /> {detailCopy.stopPipelineStopping}
              </>
            ) : (
              <>
                <X className="w-4 h-4" /> {detailCopy.stopPipeline}
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canManualRerunPhase}
            title={!canManualRerunPhase ? detailCopy.rerunPhaseManualHint : undefined}
            onClick={() =>
              void onRetryPhase(selectedPhase.id, {
                retry_comment: rerunCommentDraft.trim() || undefined,
              })
            }
          >
            <ArrowsClockwise className="w-4 h-4" /> {detailCopy.retryFailedPhase}
          </Button>
        </div>
      </>
    </Callout>
  );
}
