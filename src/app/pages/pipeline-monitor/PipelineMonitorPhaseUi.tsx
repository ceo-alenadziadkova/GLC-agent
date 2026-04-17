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
import { UI_SEMANTIC_COLORS } from '../../config/ui-semantic-colors';
import type { PhaseView } from './types';

export function PhCard({ ph, active, onSel }: { ph: PhaseView; active: boolean; onSel: () => void }) {
  const I = ph.icon;
  const stIcon = {
    completed: <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--glc-green)' }} />,
    running: <ArrowsClockwise className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--glc-blue)' }} />,
    pending: <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-quaternary)' }} />,
    review: <WarningCircle className="w-3.5 h-3.5" style={{ color: 'var(--score-3)' }} />,
    failed: <WarningCircle className="w-3.5 h-3.5" style={{ color: 'var(--score-1)' }} />,
    skipped: (
      <span
        className="text-[9px] font-bold px-1 py-0.5 rounded"
        style={{
          backgroundColor: 'var(--bg-muted)',
          color: 'var(--text-quaternary)',
          letterSpacing: '0.05em',
        }}
      >
        {PM.phaseCard.skip}
      </span>
    ),
  }[ph.status];

  return (
    <motion.button
      onClick={onSel}
      whileHover={{ x: 1 }}
      transition={{ duration: 0.15 }}
      className="w-full text-left p-3 rounded-xl"
      style={{
        backgroundColor: active ? 'var(--glc-blue-xlight)' : 'var(--bg-surface)',
        border: `1px solid ${active ? 'rgba(28,189,255,0.30)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-lg)',
        opacity: ph.status === 'pending' ? 0.5 : ph.status === 'skipped' ? 0.35 : 1,
        boxShadow: active ? '0 0 0 3px rgba(28,189,255,0.10)' : 'var(--shadow-xs)',
        transition: 'all var(--ease-fast)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: active
              ? 'var(--gradient-brand)'
              : ph.status === 'completed'
                ? 'var(--glc-green-xlight)'
                : 'var(--bg-inset)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <I
            className="w-3.5 h-3.5"
            style={{
              color: active
                ? 'var(--primary-foreground)'
                : ph.status === 'completed'
                  ? 'var(--glc-green-dark)'
                  : 'var(--text-tertiary)',
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span
              className="text-xs truncate"
              style={{
                color: active ? 'var(--glc-blue-deeper)' : 'var(--text-secondary)',
                fontWeight: active ? 600 : 400,
                fontFamily: active ? 'var(--font-display)' : 'var(--font-sans)',
              }}
            >
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
  review: { status: string };
  label: string;
  onOpenModal: () => void;
  hasWarnings?: boolean;
  canApprove: boolean;
}) {
  const done = review.status === 'approved';
  const color = done ? 'var(--glc-green)' : 'var(--score-3)';
  const bg = done ? 'var(--glc-green-xlight)' : 'var(--score-3-bg)';
  const border = done ? 'rgba(14,207,130,0.25)' : 'rgba(234,179,8,0.25)';

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
      style={{
        backgroundColor: bg,
        border: `1px solid ${border}`,
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <Star className="w-3.5 h-3.5 flex-shrink-0" style={{ color, fill: color, stroke: 'none' }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold" style={{ color, fontFamily: 'var(--font-display)' }}>
            {label}
          </span>
          {!done && hasWarnings && (
            <span title={PM.revBanner.qualityWarningsTitle} className="inline-flex flex-shrink-0">
              <WarningCircle size={12} weight="fill" style={{ color: UI_SEMANTIC_COLORS.warningOrange, flexShrink: 0 }} />
            </span>
          )}
        </div>
        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {done ? PM.revBanner.approved : hasWarnings ? PM.revBanner.qualityWarningsNotes : PM.revBanner.waitingApproval}
        </p>
      </div>
      {!done && canApprove && (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onOpenModal}
          className="text-xs font-bold px-2.5 py-1.5 rounded-lg flex-shrink-0 flex items-center gap-1"
          style={{
            background: 'var(--gradient-accent)',
            color: 'var(--primary-foreground)',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(242,79,29,0.28)',
            fontSize: '11px',
          }}
        >
          {PM.revBanner.approve} <ArrowRight className="w-3 h-3" />
        </motion.button>
      )}
      {!done && !canApprove && (
        <span
          className="text-[10px] font-medium px-2 py-1 rounded-md flex-shrink-0"
          style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}
        >
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

  const borderColor = isCompleted
    ? 'rgba(14,207,130,0.30)'
    : isFailed
      ? 'rgba(239,68,68,0.30)'
      : isRunning
        ? 'rgba(28,189,255,0.25)'
        : 'var(--border-subtle)';

  const iconBg = isCompleted
    ? 'var(--glc-green-xlight)'
    : isFailed
      ? 'rgba(239,68,68,0.12)'
      : isRunning
        ? 'var(--glc-blue-xlight)'
        : 'var(--bg-inset)';

  const iconColor = isCompleted
    ? 'var(--glc-green-dark)'
    : isFailed
      ? UI_SEMANTIC_COLORS.danger
      : isRunning
        ? 'var(--glc-blue)'
        : 'var(--text-quaternary)';

  return (
    <div
      className="rounded-xl p-2.5"
      style={{ backgroundColor: 'var(--bg-surface)', border: `1px solid ${borderColor}`, flex: '1 1 0' }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg }}>
          <I className="w-3 h-3" style={{ color: iconColor }} />
        </div>
        <span
          className="text-[10px] font-semibold truncate"
          style={{
            color: isRunning ? 'var(--glc-blue-deeper)' : 'var(--text-secondary)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {ph.name}
        </span>
      </div>

      {isRunning && (
        <div className="rounded-full overflow-hidden" style={{ height: 3, backgroundColor: 'rgba(28,189,255,0.15)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'var(--gradient-brand)' }}
            initial={{ width: '10%' }}
            animate={{ width: '80%' }}
            transition={{ duration: 3.5, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' }}
          />
        </div>
      )}
      {isCompleted && ph.score !== null && <ScoreBadge score={ph.score} size="sm" />}
      {isCompleted && ph.score === null && (
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" style={{ color: 'var(--glc-green)' }} />
          <span style={{ fontSize: 10, color: 'var(--glc-green)', fontFamily: 'var(--font-display)' }}>{PM.miniCard.done}</span>
        </div>
      )}
      {isFailed && (
        <div className="flex items-center gap-1">
          <WarningCircle className="w-3 h-3" style={{ color: UI_SEMANTIC_COLORS.danger }} />
          <span style={{ fontSize: 10, color: UI_SEMANTIC_COLORS.danger, fontFamily: 'var(--font-display)' }}>{PM.miniCard.failed}</span>
        </div>
      )}
      {!isRunning && !isCompleted && !isFailed && (
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" style={{ color: 'var(--text-quaternary)' }} />
          <span style={{ fontSize: 10, color: 'var(--text-quaternary)', fontFamily: 'var(--font-display)' }}>{PM.miniCard.waiting}</span>
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
      className="rounded-xl p-4"
      style={{
        backgroundColor: 'var(--glc-blue-xlight)',
        border: '1px solid rgba(28,189,255,0.20)',
        marginBottom: 8,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <ArrowsClockwise className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--glc-blue)' }} />
        <span className="text-xs font-bold" style={{ color: 'var(--glc-blue-deeper)', fontFamily: 'var(--font-display)' }}>
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
