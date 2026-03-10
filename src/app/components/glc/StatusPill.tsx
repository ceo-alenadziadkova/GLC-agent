type Status = 'pending' | 'running' | 'completed' | 'review' | 'failed' | 'active' | 'paused';

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; dot: string }> = {
  pending:   { label: 'Pending',      color: 'var(--text-tertiary)',  bg: 'var(--bg-muted)',        dot: 'var(--border-strong)' },
  running:   { label: 'Running',      color: 'var(--glc-blue)',       bg: 'var(--glc-blue-xlight)', dot: 'var(--glc-blue)'      },
  completed: { label: 'Completed',    color: 'var(--glc-green-dark)', bg: 'var(--glc-green-xlight)',dot: 'var(--glc-green)'     },
  review:    { label: 'Needs Review', color: '#92400E',               bg: '#FFFBEB',                dot: 'var(--score-3)'       },
  failed:    { label: 'Failed',       color: 'var(--score-1)',        bg: 'var(--score-1-bg)',       dot: 'var(--score-1)'       },
  active:    { label: 'Active',       color: 'var(--glc-green-dark)', bg: 'var(--glc-green-xlight)',dot: 'var(--glc-green)'     },
  paused:    { label: 'Paused',       color: 'var(--text-secondary)', bg: 'var(--bg-muted)',         dot: 'var(--text-tertiary)' },
};

interface StatusPillProps {
  status: Status;
  label?: string;
  pulse?: boolean;
}

export function StatusPill({ status, label, pulse = false }: StatusPillProps) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      <span className="relative inline-flex rounded-full flex-shrink-0" style={{ width: 6, height: 6 }}>
        {pulse && status === 'running' && (
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
            style={{ backgroundColor: cfg.dot }}
          />
        )}
        <span className="relative rounded-full w-full h-full" style={{ backgroundColor: cfg.dot }} />
      </span>
      {label ?? cfg.label}
    </span>
  );
}
