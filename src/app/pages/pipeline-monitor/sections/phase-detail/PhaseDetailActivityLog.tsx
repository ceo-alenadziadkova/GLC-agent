import { Check, CircleNotch, Terminal, X } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { PIPELINE_MONITOR_COPY as PM } from '../../../../config/pipeline-monitor-copy';
import { PIPELINE_MONITOR_UI_POLICY } from '../../config/pipeline-monitor-ui-policy';
import { cn } from '../../../../components/ui/utils';
import type { PhaseView } from '../../types';
import type { PhaseDetailCopy } from './phase-detail-types';

type Props = {
  selectedPhase: PhaseView;
  isClient: boolean;
  detailCopy: PhaseDetailCopy;
};

export function PhaseDetailActivityLog(props: Props) {
  const { selectedPhase, isClient, detailCopy } = props;
  if (selectedPhase.log.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-xl border shadow-md">
      <div className="border-b border-[var(--overlay-white-20)] bg-[var(--ui-code-surface)] flex flex-col gap-1 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="bg-destructive h-2.5 w-2.5 rounded-full" />
            <span className="bg-warning h-2.5 w-2.5 rounded-full" />
            <span className="bg-success h-2.5 w-2.5 rounded-full" />
          </div>
          <Terminal className="ml-2 h-3.5 w-3.5 text-[var(--overlay-white-35)]" />
          <span className="text-[var(--overlay-white-30)] text-xs font-bold ds-pipeline-log-header-tracking uppercase">
            {detailCopy.agentLogPrefix} {selectedPhase.name}
          </span>
        </div>
        {isClient ? (
          <p className="text-[var(--overlay-white-30)] text-xs font-normal normal-case leading-snug tracking-normal">
            {PM.clientPortal.detail.activityLogClientHint}
          </p>
        ) : null}
      </div>
      <div className="bg-[var(--glc-ink)] font-mono space-y-2 p-4 text-xs">
        {selectedPhase.log.map((entry, index) => {
          const isOk = entry.eventType === 'completed' || entry.eventType === 'fact_check';
          const isErr = entry.eventType === 'error';
          return (
            <motion.div
              key={`${entry.text}-${index}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: index * PIPELINE_MONITOR_UI_POLICY.animation.logEntryDelayStepSec,
                duration: PIPELINE_MONITOR_UI_POLICY.animation.logEntryDurationSec,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={cn(
                'flex items-start gap-1.5 leading-relaxed',
                isOk ? 'text-emerald-300' : isErr ? 'text-rose-300' : 'text-slate-400',
              )}
            >
              {isOk ? (
                <Check size={11} weight="bold" className="ds-pipeline-log-icon-mt shrink-0" />
              ) : isErr ? (
                <X size={11} weight="bold" className="ds-pipeline-log-icon-mt shrink-0" />
              ) : (
                <CircleNotch size={11} className="ds-pipeline-log-icon-mt shrink-0" />
              )}
              <span>{entry.text}</span>
            </motion.div>
          );
        })}
        {selectedPhase.status === 'running' && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: PIPELINE_MONITOR_UI_POLICY.animation.cursorBlinkDurationSec, repeat: Infinity }}
            className="text-info inline-block"
            aria-hidden
          >
            ▌
          </motion.span>
        )}
      </div>
    </div>
  );
}
