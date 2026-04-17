import { motion } from 'motion/react';
import { ArrowsClockwise, X } from '@phosphor-icons/react';
import { StatusBadge } from '../../../components/ui/status-badge';
import { Button } from '../../../components/ui/button';
import { StatusPill } from '../../../components/glc/StatusPill';
import { PIPELINE_MONITOR_COPY as PM } from '../../../config/pipeline-monitor-copy';
import { PIPELINE_MONITOR_UI_POLICY } from '../config/pipeline-monitor-ui-policy';

export function MonitorHeaderActions(props: {
  isExpress: boolean;
  progressPct: number;
  auditStatus: string;
  canStopPipeline: boolean;
  isStopping: boolean;
  onOpenStopDialog: () => void;
}) {
  const { isExpress, progressPct, auditStatus, canStopPipeline, isStopping, onOpenStopDialog } = props;
  return (
    <div className="flex items-center gap-3">
      {isExpress && (
        <StatusBadge
          label={PM.expressBadge}
          toneClassName="border border-[rgba(28,189,255,0.25)] bg-[rgba(28,189,255,0.10)] font-bold tracking-[0.04em] text-[var(--glc-blue)]"
          className="font-[var(--font-display)]"
        />
      )}
      <div className="flex items-center gap-2.5">
        <div
          className="w-28 overflow-hidden rounded-full bg-[var(--border-subtle)]"
          style={{ height: PIPELINE_MONITOR_UI_POLICY.sizing.progressBarHeightPx }}
        >
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
      <StatusPill
        status={
          auditStatus === 'completed'
            ? 'completed'
            : auditStatus === 'cancelled'
              ? 'cancelled'
              : auditStatus === 'failed'
                ? 'review'
                : 'running'
        }
        pulse={auditStatus !== 'completed' && auditStatus !== 'failed' && auditStatus !== 'cancelled'}
      />
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
