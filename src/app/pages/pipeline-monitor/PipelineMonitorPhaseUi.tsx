import { motion } from 'motion/react';
import {
  ArrowsClockwise,
  ArrowRight,
  CheckCircle,
  Clock,
  Star,
  WarningCircle,
} from '@phosphor-icons/react';
import { ScoreBadge } from '../../components/glc/ScoreBadge';
import { PIPELINE_MONITOR_COPY as PM } from '../../config/pipeline-monitor-copy';
import type { PhaseView } from './types';
import type { PipelineReview } from './types-pipeline-state';
import { cn } from '../../components/ui/utils';

export function PhCard({ ph, active, onSel }: { ph: PhaseView; active: boolean; onSel: () => void }) {
  const I = ph.icon;
  const stIcon = {
    completed: <CheckCircle className="text-success h-3.5 w-3.5" />,
    running: <ArrowsClockwise className="text-info h-3.5 w-3.5 animate-spin" />,
    pending: <Clock className="text-muted-foreground h-3.5 w-3.5" />,
    review: <WarningCircle className="text-warning h-3.5 w-3.5" />,
    failed: <WarningCircle className="text-destructive h-3.5 w-3.5" />,
    skipped: (
      <span className="bg-muted text-muted-foreground rounded px-1 py-0.5 ds-ph-card-skip-badge">
        {PM.phaseCard.skip}
      </span>
    ),
  }[ph.status];

  return (
    <motion.button
      onClick={onSel}
      whileHover={{ x: 1 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'w-full rounded-xl border p-3 text-left transition-all',
        active ? 'ds-pipeline-phase-card-active' : 'bg-card',
        ph.status === 'pending' ? 'opacity-50' : ph.status === 'skipped' ? 'opacity-35' : '',
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md',
            active
              ? 'ds-pipeline-phase-icon-active'
              : ph.status === 'completed'
                ? 'bg-success/10'
                : 'bg-muted',
          )}
        >
          <I
            className={cn(
              'h-3.5 w-3.5',
              active
                ? 'text-primary-foreground'
                : ph.status === 'completed'
                  ? 'text-success'
                  : 'text-muted-foreground',
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className={cn('truncate text-xs', active ? 'text-info font-semibold' : 'text-muted-foreground font-normal')}>
              {ph.name}
            </span>
            {stIcon}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {ph.score !== null && <ScoreBadge score={ph.score} size="sm" />}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

export function RevBanner({
  review,
  label,
  onOpenModal,
  hasWarnings,
  canApprove,
}: {
  review: PipelineReview;
  label: string;
  onOpenModal: () => void;
  hasWarnings?: boolean;
  canApprove: boolean;
}) {
  const done = review.status === 'approved';
  const consultantSaved = (review.consultant_notes ?? '').trim();
  const interviewSaved = (review.interview_notes ?? '').trim();
  const hasSavedNotes = done && (consultantSaved.length > 0 || interviewSaved.length > 0);
  return (
    <div className={cn('flex items-center gap-2.5 rounded-xl border px-3 py-2.5', done ? 'border-success/40 bg-success/10' : 'border-warning/40 bg-warning/10')}>
      <Star className={cn('h-3.5 w-3.5 flex-shrink-0', done ? 'text-success' : 'text-warning')} weight="fill" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn('text-xs font-bold', done ? 'text-success' : 'text-warning')}>
            {label}
          </span>
          {!done && hasWarnings && (
            <span title={PM.revBanner.qualityWarningsTitle} className="inline-flex flex-shrink-0">
              <WarningCircle size={12} weight="fill" className="text-warning flex-shrink-0" />
            </span>
          )}
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {done ? PM.revBanner.approved : hasWarnings ? PM.revBanner.qualityWarningsNotes : PM.revBanner.waitingApproval}
        </p>
        {hasSavedNotes ? (
          <div className="border-border/60 mt-2 max-h-28 space-y-2 overflow-y-auto border-t pt-2 text-left">
            {consultantSaved ? (
              <div>
                <p className="text-muted-foreground text-[length:var(--text-2xs)] font-semibold uppercase tracking-wide">
                  {PM.revBanner.savedConsultantNotes}
                </p>
                <p className="text-foreground mt-0.5 whitespace-pre-wrap break-words text-[length:var(--text-2xs)] leading-snug">
                  {consultantSaved}
                </p>
              </div>
            ) : null}
            {interviewSaved ? (
              <div>
                <p className="text-muted-foreground text-[length:var(--text-2xs)] font-semibold uppercase tracking-wide">
                  {PM.revBanner.savedInterviewNotes}
                </p>
                <p className="text-foreground mt-0.5 whitespace-pre-wrap break-words text-[length:var(--text-2xs)] leading-snug">
                  {interviewSaved}
                </p>
              </div>
            ) : null}
          </div>
        ) : done ? (
          <p className="text-muted-foreground mt-1 text-[length:var(--text-2xs)] leading-snug">{PM.revBanner.noNotesSaved}</p>
        ) : null}
      </div>
      {!done && canApprove && (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onOpenModal}
          className="ds-pipeline-approve-cta flex flex-shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold"
        >
          {PM.revBanner.approve} <ArrowRight className="w-3 h-3" />
        </motion.button>
      )}
      {!done && !canApprove && (
        <span className="text-muted-foreground flex-shrink-0 rounded-md border px-2 py-1 text-[length:var(--text-2xs)] font-medium">
          {PM.revBanner.consultantApproval}
        </span>
      )}
    </div>
  );
}

function ParallelMiniCard({ ph }: { ph: PhaseView }) {
  const I = ph.icon;
  const isRunning = ph.status === 'running';
  const isCompleted = ph.status === 'completed';
  const isFailed = ph.status === 'failed';

  return (
    <div className={cn('bg-card flex-1 rounded-xl border p-2.5', isCompleted ? 'border-success/40' : isFailed ? 'border-destructive/40' : isRunning ? 'border-info/40' : 'border-border')}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={cn('flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md', isCompleted ? 'bg-success/10' : isFailed ? 'bg-destructive/10' : isRunning ? 'bg-info/10' : 'bg-muted')}>
          <I className={cn('h-3 w-3', isCompleted ? 'text-success' : isFailed ? 'text-destructive' : isRunning ? 'text-info' : 'text-muted-foreground')} />
        </div>
        <span className={cn('truncate text-[length:var(--text-2xs)] font-semibold', isRunning ? 'text-info' : 'text-muted-foreground')}>
          {ph.name}
        </span>
      </div>

      {isRunning && (
        <div className="ds-pipeline-running-track ds-step1-brief-progress-thin overflow-hidden rounded-full">
          <motion.div
            className="ds-pipeline-running-bar h-full rounded-full"
            initial={{ width: '10%' }}
            animate={{ width: '80%' }}
            transition={{ duration: 3.5, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' }}
          />
        </div>
      )}
      {isCompleted && ph.score !== null && <ScoreBadge score={ph.score} size="sm" />}
      {isCompleted && ph.score === null && (
        <div className="flex items-center gap-1">
          <CheckCircle className="text-success h-3 w-3" />
          <span className="text-success text-[length:var(--text-2xs)]">{PM.miniCard.done}</span>
        </div>
      )}
      {isFailed && (
        <div className="flex items-center gap-1">
          <WarningCircle className="text-destructive h-3 w-3" />
          <span className="text-destructive text-[length:var(--text-2xs)]">{PM.miniCard.failed}</span>
        </div>
      )}
      {!isRunning && !isCompleted && !isFailed && (
        <div className="flex items-center gap-1">
          <Clock className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground text-[length:var(--text-2xs)]">{PM.miniCard.waiting}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Shows a parallel execution overview with mini cards for each wing phase.
 * Displayed when any phase in the wing is currently running.
 */
export function ParallelWingBanner({ phases, wingName }: { phases: PhaseView[]; wingName: string }) {
  const anyRunning = phases.some(p => p.status === 'running');
  if (!anyRunning) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="ds-pipeline-info-surface mb-2 rounded-xl border p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <ArrowsClockwise className="text-info h-3.5 w-3.5 animate-spin" />
        <span className="text-info text-xs font-bold">
          {wingName}{PM.parallelWing.runningSuffix}
        </span>
      </div>
      <div className="flex gap-2">
        {phases.map(ph => (
          <ParallelMiniCard key={ph.id} ph={ph} />
        ))}
      </div>
    </motion.div>
  );
}
