import type { CSSProperties } from 'react';
import { motion } from 'motion/react';

interface ScoreBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SCORE_SIZE_STYLE = {
  sm: {
    padding: 'var(--space-0-5) var(--space-2)',
    fontSize: 'var(--text-xs)',
    dotSize: 5,
    labelOffset: 'var(--space-0-5)',
  },
  md: {
    padding: 'var(--space-1) var(--space-2-5)',
    fontSize: 'var(--text-xs)',
    dotSize: 6,
    labelOffset: 'var(--space-0-5)',
  },
  lg: {
    padding: 'var(--space-1-5) var(--space-3)',
    fontSize: 'var(--text-sm)',
    dotSize: 7,
    labelOffset: 'var(--space-1)',
  },
} as const;

const SCORE_CONFIG = {
  5: {
    color: 'var(--score-5)',
    bg: 'var(--score-5-bg)',
    border: 'var(--score-5-border)',
    label: 'Excellent',
    gradient: 'var(--gradient-success)',
  },
  4: {
    color: 'var(--score-4)',
    bg: 'var(--score-4-bg)',
    border: 'var(--score-4-border)',
    label: 'Good',
    gradient: 'var(--gradient-success)',
  },
  3: {
    color: 'var(--score-3)',
    bg: 'var(--score-3-bg)',
    border: 'var(--score-3-border)',
    label: 'Needs Attention',
    gradient: 'var(--gradient-accent)',
  },
  2: {
    color: 'var(--score-2)',
    bg: 'var(--score-2-bg)',
    border: 'var(--score-2-border)',
    label: 'Issues',
    gradient: 'var(--gradient-accent)',
  },
  1: {
    color: 'var(--score-1)',
    bg: 'var(--score-1-bg)',
    border: 'var(--score-1-border)',
    label: 'Critical',
    gradient: 'var(--gradient-accent)',
  },
} as const;

export function ScoreBadge({ score, showLabel = false, size = 'md' }: ScoreBadgeProps) {
  const clamp = Math.min(5, Math.max(1, Math.round(score)));
  const cfg   = SCORE_CONFIG[clamp as keyof typeof SCORE_CONFIG];
  const sizeCfg = SCORE_SIZE_STYLE[size];

  return (
    <span
      className="inline-flex items-center gap-1.5 font-semibold rounded-full"
      style={{
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        padding: sizeCfg.padding,
        fontSize: sizeCfg.fontSize,
        fontFamily: 'var(--font-mono)',
        letterSpacing: 'var(--tracking-tight)',
      }}
      aria-label={`Score ${clamp}/5 — ${cfg.label}`}
    >
      {/* Filled dot with glow */}
      <span
        className="rounded-full flex-shrink-0"
        style={{
          width: sizeCfg.dotSize,
          height: sizeCfg.dotSize,
          background: cfg.gradient,
          boxShadow: `0 0 ${sizeCfg.dotSize}px color-mix(in oklab, ${cfg.color} 80%, transparent)`,
        }}
      />
      {clamp}/5
      {showLabel && (
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            marginLeft: sizeCfg.labelOffset,
            fontSize: sizeCfg.fontSize,
          }}
        >
          {cfg.label}
        </span>
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
      <div className="ds-scorebar-track flex-1 rounded-full overflow-hidden">
        <motion.div
          className="ds-scorebar-fill h-full rounded-full"
          style={{ ['--scorebar-fill' as string]: cfg.gradient } as CSSProperties}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <span
        className="font-semibold text-right flex-shrink-0 tabular-nums"
        style={{
          color: cfg.color,
          fontSize: 'var(--text-xs)',
          fontFamily: 'var(--font-mono)',
          width: 'var(--space-4)',
        }}
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
        boxShadow: `0 0 ${size}px color-mix(in oklab, ${cfg.color} 60%, transparent)`,
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
        className="ds-score-badge-filter-host"
        style={
          {
            ['--score-badge-filter' as string]: `drop-shadow(0 0 ${strokeW * 2}px ${cfg.color}80)`,
          } as CSSProperties
        }
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
