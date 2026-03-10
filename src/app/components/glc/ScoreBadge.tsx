interface ScoreBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SCORE_CONFIG = {
  5: { color: 'var(--score-5)', bg: 'var(--score-5-bg)', label: 'Excellent' },
  4: { color: 'var(--score-4)', bg: 'var(--score-4-bg)', label: 'Good' },
  3: { color: 'var(--score-3)', bg: 'var(--score-3-bg)', label: 'Needs Attention' },
  2: { color: 'var(--score-2)', bg: 'var(--score-2-bg)', label: 'Significant Issues' },
  1: { color: 'var(--score-1)', bg: 'var(--score-1-bg)', label: 'Critical' },
} as const;

export function ScoreBadge({ score, showLabel = false, size = 'md' }: ScoreBadgeProps) {
  const clamp = Math.min(5, Math.max(1, Math.round(score)));
  const cfg = SCORE_CONFIG[clamp as keyof typeof SCORE_CONFIG];

  const pad = { sm: '2px 7px', md: '3px 9px', lg: '4px 12px' }[size];
  const fs  = { sm: '11px',    md: '12px',    lg: '13px'    }[size];
  const dot = { sm: 5,         md: 6,         lg: 7         }[size];

  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono font-semibold rounded-full"
      style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}`, padding: pad, fontSize: fs }}
      aria-label={`Score ${clamp}/5 — ${cfg.label}`}
    >
      <span className="rounded-full flex-shrink-0" style={{ width: dot, height: dot, backgroundColor: cfg.color }} />
      {clamp}/5
      {showLabel && (
        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, marginLeft: 2 }}>{cfg.label}</span>
      )}
    </span>
  );
}

export function ScoreBar({ score }: { score: number }) {
  const clamp = Math.min(5, Math.max(1, Math.round(score)));
  const cfg = SCORE_CONFIG[clamp as keyof typeof SCORE_CONFIG];
  return (
    <div className="flex items-center gap-2 w-16">
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 3, backgroundColor: 'var(--border-subtle)' }}>
        <div className="h-full rounded-full" style={{ width: `${(score / 5) * 100}%`, backgroundColor: cfg.color }} />
      </div>
      <span className="font-mono text-xs font-semibold w-4 text-right flex-shrink-0" style={{ color: cfg.color }}>{score}</span>
    </div>
  );
}

export function ScoreDot({ score, size = 7 }: { score: number; size?: number }) {
  const clamp = Math.min(5, Math.max(1, Math.round(score)));
  const cfg = SCORE_CONFIG[clamp as keyof typeof SCORE_CONFIG];
  return (
    <span className="inline-block rounded-full flex-shrink-0" style={{ width: size, height: size, backgroundColor: cfg.color }} />
  );
}

export function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const clamp = Math.min(5, Math.max(1, Math.round(score)));
  const cfg = SCORE_CONFIG[clamp as keyof typeof SCORE_CONFIG];
  const pct = (score / 5);
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="3" />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={cfg.color} strokeWidth="3"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      <text x={size/2} y={size/2 + 4} textAnchor="middle" fontSize="13" fontWeight="700" fill={cfg.color} fontFamily="monospace">
        {score}
      </text>
    </svg>
  );
}
