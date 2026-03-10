import { motion } from 'motion/react';

interface ScoreBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SCORE_CONFIG = {
  5: { color: 'var(--score-5)', bg: 'var(--score-5-bg)', border: 'var(--score-5-border)', label: 'Excellent',     gradient: 'linear-gradient(135deg, #0ECF82, #0AB36F)' },
  4: { color: 'var(--score-4)', bg: 'var(--score-4-bg)', border: 'var(--score-4-border)', label: 'Good',           gradient: 'linear-gradient(135deg, #22C55E, #16A34A)' },
  3: { color: 'var(--score-3)', bg: 'var(--score-3-bg)', border: 'var(--score-3-border)', label: 'Needs Attention', gradient: 'linear-gradient(135deg, #EAB308, #CA8A04)' },
  2: { color: 'var(--score-2)', bg: 'var(--score-2-bg)', border: 'var(--score-2-border)', label: 'Issues',          gradient: 'linear-gradient(135deg, #F97316, #EA580C)' },
  1: { color: 'var(--score-1)', bg: 'var(--score-1-bg)', border: 'var(--score-1-border)', label: 'Critical',        gradient: 'linear-gradient(135deg, #EF4444, #DC2626)' },
} as const;

export function ScoreBadge({ score, showLabel = false, size = 'md' }: ScoreBadgeProps) {
  const clamp = Math.min(5, Math.max(1, Math.round(score)));
  const cfg   = SCORE_CONFIG[clamp as keyof typeof SCORE_CONFIG];

  const pad = { sm: '2px 8px', md: '3px 10px', lg: '5px 13px' }[size];
  const fs  = { sm: '11px',    md: '12px',      lg: '13px'     }[size];
  const dot = { sm: 5,         md: 6,            lg: 7          }[size];

  return (
    <span
      className="inline-flex items-center gap-1.5 font-semibold rounded-full"
      style={{
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        padding: pad,
        fontSize: fs,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '-0.01em',
      }}
      aria-label={`Score ${clamp}/5 — ${cfg.label}`}
    >
      {/* Filled dot with glow */}
      <span
        className="rounded-full flex-shrink-0"
        style={{
          width: dot,
          height: dot,
          background: cfg.gradient,
          boxShadow: `0 0 ${dot}px ${cfg.color}80`,
        }}
      />
      {clamp}/5
      {showLabel && (
        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, marginLeft: 2, fontSize: fs }}>{cfg.label}</span>
      )}
    </span>
  );
}

export function ScoreBar({ score }: { score: number }) {
  const clamp = Math.min(5, Math.max(1, Math.round(score)));
  const cfg   = SCORE_CONFIG[clamp as keyof typeof SCORE_CONFIG];
  const pct   = (score / 5) * 100;

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: 3, backgroundColor: 'var(--border-subtle)', minWidth: 48 }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: cfg.gradient }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <span
        className="font-semibold text-right flex-shrink-0 tabular-nums"
        style={{ color: cfg.color, fontSize: '11px', fontFamily: 'var(--font-mono)', width: 16 }}
      >
        {score}
      </span>
    </div>
  );
}

export function ScoreDot({ score, size = 7 }: { score: number; size?: number }) {
  const clamp = Math.min(5, Math.max(1, Math.round(score)));
  const cfg   = SCORE_CONFIG[clamp as keyof typeof SCORE_CONFIG];
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: cfg.gradient,
        boxShadow: `0 0 ${size}px ${cfg.color}60`,
      }}
    />
  );
}

export function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const clamp = Math.min(5, Math.max(1, Math.round(score)));
  const cfg   = SCORE_CONFIG[clamp as keyof typeof SCORE_CONFIG];
  const strokeW = size > 60 ? 4 : 3;
  const r    = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = score / 5;

  return (
    <svg width={size} height={size} className="flex-shrink-0" style={{ transform: 'rotate(-90deg)' }}>
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="var(--border-subtle)"
        strokeWidth={strokeW}
      />
      {/* Progress */}
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={cfg.color}
        strokeWidth={strokeW}
        strokeDasharray={circ}
        strokeLinecap="round"
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - pct) }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ filter: `drop-shadow(0 0 ${strokeW * 2}px ${cfg.color}80)` }}
      />
      {/* Number */}
      <text
        x={size / 2} y={size / 2 + 5}
        textAnchor="middle"
        fontSize={size > 60 ? 18 : 13}
        fontWeight="700"
        fill={cfg.color}
        fontFamily="var(--font-mono)"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px` }}
      >
        {score}
      </text>
    </svg>
  );
}
