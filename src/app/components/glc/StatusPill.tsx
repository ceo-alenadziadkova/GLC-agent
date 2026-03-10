type Status = 'pending' | 'running' | 'completed' | 'review' | 'failed' | 'active' | 'paused';

const STATUS_CONFIG: Record<Status, {
  label: string;
  color: string;
  bg: string;
  dot: string;
  border: string;
}> = {
  pending:   { label: 'Pending',       color: 'var(--text-tertiary)',   bg: 'var(--bg-muted)',         dot: 'var(--border-strong)',      border: 'var(--border-subtle)'  },
  running:   { label: 'Running',       color: 'var(--glc-blue-deeper)', bg: 'var(--glc-blue-xlight)',  dot: 'var(--glc-blue)',           border: 'rgba(28,189,255,0.25)' },
  completed: { label: 'Completed',     color: 'var(--glc-green-dark)',  bg: 'var(--glc-green-xlight)', dot: 'var(--glc-green)',          border: 'rgba(14,207,130,0.25)' },
  review:    { label: 'Needs Review',  color: '#92400E',                bg: '#FFFBEB',                 dot: 'var(--score-3)',            border: 'rgba(234,179,8,0.25)'  },
  failed:    { label: 'Failed',        color: 'var(--score-1)',         bg: 'var(--score-1-bg)',        dot: 'var(--score-1)',            border: 'var(--score-1-border)' },
  active:    { label: 'Active',        color: 'var(--glc-green-dark)',  bg: 'var(--glc-green-xlight)', dot: 'var(--glc-green)',          border: 'rgba(14,207,130,0.25)' },
  paused:    { label: 'Paused',        color: 'var(--text-secondary)',  bg: 'var(--bg-muted)',          dot: 'var(--text-quaternary)',    border: 'var(--border-subtle)'  },
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
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium"
      style={{
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        fontSize: '11px',
        letterSpacing: '0.01em',
      }}
    >
      <span className="relative inline-flex rounded-full flex-shrink-0" style={{ width: 6, height: 6 }}>
        {pulse && status === 'running' && (
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
            style={{ backgroundColor: cfg.dot }}
          />
        )}
        <span
          className="relative rounded-full w-full h-full"
          style={{
            backgroundColor: cfg.dot,
            boxShadow: (status === 'running' || status === 'active' || status === 'completed')
              ? `0 0 5px ${cfg.dot}80`
              : 'none',
          }}
        />
      </span>
      {label ?? cfg.label}
    </span>
  );
}
