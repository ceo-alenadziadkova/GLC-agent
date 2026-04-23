import { motion } from 'motion/react';
import { ArrowsClockwise, X } from '@phosphor-icons/react';
import { StatusBadge } from '../../../components/ui/status-badge';
import { Button } from '../../../components/ui/button';
import { StatusPill } from '../../../components/glc/StatusPill';
import { PIPELINE_MONITOR_COPY as PM } from '../../../config/pipeline-monitor-copy';
import { getPipelineMonitorHeaderPresentation } from '../../../lib/pipeline-monitor-helpers';
import { PIPELINE_MONITOR_UI_POLICY } from '../config/pipeline-monitor-ui-policy';
import { cn } from '../../../components/ui/utils';

export function MonitorHeaderActions(props: {
  isExpress: boolean;
  progressPct: number;
  auditStatus: string;
  /** True while POST /pipeline/next is in flight but DB row may still be `review` — show running pulse in the header. */
  isAdvancingFromReview?: boolean;
  canStopPipeline: boolean;
  isStopping: boolean;
  onOpenStopDialog: () => void;
  isClient: boolean;
  failedRetryPhase: number | null;
  onRetryFailedPhase: (phase: number) => void | Promise<void>;
}) {
  const {
    isExpress,
    progressPct,
    auditStatus,
    isAdvancingFromReview = false,
    canStopPipeline,
    isStopping,
    onOpenStopDialog,
    isClient,
    failedRetryPhase,
    onRetryFailedPhase,
  } = props;
  const showHeaderRetry =
    auditStatus === PIPELINE_MONITOR_UI_POLICY.status.failed && !isClient && failedRetryPhase !== null;
  const headerPill = isAdvancingFromReview
    ? { status: 'running' as const, pulse: true }
    : getPipelineMonitorHeaderPresentation(auditStatus);

  if (isClient) {
    const cp = PIPELINE_MONITOR_UI_POLICY.clientPortal;
    return (
      <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex w-full max-w-[length:var(--pipeline-monitor-header-actions-max-width)] items-center justify-end gap-2.5 sm:w-auto sm:max-w-none">
          <div className={cp.headerProgressTrackClassName}>
            <motion.div
              className={cn('h-full rounded-full', cp.headerProgressFillClassName)}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: PIPELINE_MONITOR_UI_POLICY.animation.progressDurationSec, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <span className={cp.headerPercentClassName}>{progressPct}%</span>
        </div>
        <StatusPill status={headerPill.status} pulse={headerPill.pulse} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {isExpress && (
        <StatusBadge
          label={PM.expressBadge}
          toneClassName="border border-[color:var(--glc-blue-alpha-25)] bg-[var(--glc-blue-muted)] font-bold ds-pipeline-express-badge-tracking text-[var(--glc-blue)]"
          className="font-[var(--font-display)]"
        />
      )}
      <div className="flex items-center gap-2.5">
        <div className="h-[var(--space-1)] w-28 overflow-hidden rounded-full bg-[var(--border-subtle)]">
          <motion.div
            className="h-full rounded-full bg-[var(--glc-green)] shadow-[0_0_6px_var(--glc-green)]"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: PIPELINE_MONITOR_UI_POLICY.animation.progressDurationSec, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <span className="text-xs font-mono font-bold tabular-nums text-[var(--glc-green)]">
          {progressPct}%
        </span>
      </div>
      <StatusPill status={headerPill.status} pulse={headerPill.pulse} />
      {showHeaderRetry && (
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={() => void onRetryFailedPhase(failedRetryPhase!)}
        >
          <ArrowsClockwise className="w-4 h-4" />
          {PM.header.retryFailedPipeline}
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-[var(--score-1)]"
        onClick={onOpenStopDialog}
        disabled={!canStopPipeline || isStopping}
      >
        {isStopping ? (
          <>
            <ArrowsClockwise className="w-4 h-4 animate-spin" /> {PM.detail.stopPipelineStopping}
          </>
        ) : (
          <>
            <X className="w-4 h-4" /> {PM.detail.stopPipeline}
          </>
        )}
      </Button>
    </div>
  );
}
