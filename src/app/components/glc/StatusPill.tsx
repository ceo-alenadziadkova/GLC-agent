import { StatusBadge, type StatusBadgeTone } from '../../../design-system/ui';

type Status =
  | 'pending'
  | 'running'
  | 'completed'
  | 'review'
  | 'failed'
  | 'cancelled'
  | 'active'
  | 'paused'
  | 'skipped';

const STATUS_CONFIG: Record<Status, {
  label: string;
  tone: StatusBadgeTone;
  pillClassName?: string;
  dotClassName: string;
  pulseClassName?: string;
}> = {
  pending: {
    label: 'Pending',
    tone: 'neutral',
    dotClassName: 'bg-[var(--border-strong)]',
  },
  running: {
    label: 'Running',
    tone: 'info',
    dotClassName: 'bg-[var(--text-blue)] shadow-[0_0_5px_var(--text-blue)]',
    pulseClassName: 'bg-[var(--text-blue)]',
  },
  completed: {
    label: 'Completed',
    tone: 'success',
    dotClassName: 'bg-[var(--score-5)] shadow-[0_0_5px_var(--score-5)]',
  },
  review: {
    label: 'Needs Review',
    tone: 'warning',
    dotClassName: 'bg-[var(--score-3)]',
  },
  failed: {
    label: 'Failed',
    tone: 'danger',
    dotClassName: 'bg-[var(--score-1)]',
  },
  cancelled: {
    label: 'Cancelled',
    tone: 'neutral',
    pillClassName: 'text-[var(--text-secondary)]',
    dotClassName: 'bg-[var(--text-quaternary)]',
  },
  active: {
    label: 'Active',
    tone: 'success',
    dotClassName: 'bg-[var(--score-5)] shadow-[0_0_5px_var(--score-5)]',
  },
  paused: {
    label: 'Paused',
    tone: 'neutral',
    pillClassName: 'text-[var(--text-secondary)]',
    dotClassName: 'bg-[var(--text-quaternary)]',
  },
  skipped: {
    label: 'Skipped',
    tone: 'neutral',
    dotClassName: 'bg-[var(--border-strong)]',
  },
};

interface StatusPillProps {
  status: Status;
  label?: string;
  pulse?: boolean;
}

export function StatusPill({ status, label, pulse = false }: StatusPillProps) {
  const cfg = STATUS_CONFIG[status];
  return (
    <StatusBadge
      label={label ?? cfg.label}
      tone={cfg.tone}
      toneClassName={cfg.pillClassName}
      dotClassName={cfg.dotClassName}
      pulse={pulse && status === 'running'}
      pulseClassName={cfg.pulseClassName}
    />
  );
}
