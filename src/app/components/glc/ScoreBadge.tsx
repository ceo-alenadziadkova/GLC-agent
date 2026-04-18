import type { CSSProperties } from 'react';
import { motion } from 'motion/react';

import { cn } from '../ui/utils';

interface ScoreBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SCORE_SIZE_STYLE = {
  sm: {
    dotSize: 5,
    labelOffset: 'var(--space-0-5)',
  },
  md: {
    dotSize: 6,
    labelOffset: 'var(--space-0-5)',
  },
  lg: {
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

function scoreBadgeCssVars(
  cfg: (typeof SCORE_CONFIG)[keyof typeof SCORE_CONFIG],
  sizeCfg: (typeof SCORE_SIZE_STYLE)['sm'],
): CSSProperties {
  return {
    ['--ds-score-badge-bg' as string]: cfg.bg,
    ['--ds-score-badge-fg' as string]: cfg.color,
    ['--ds-score-badge-border' as string]: cfg.border,
    ['--ds-score-badge-label-offset' as string]: sizeCfg.labelOffset,
    ['--ds-score-badge-dot-size' as string]: `${sizeCfg.dotSize}px`,
    ['--ds-score-badge-dot-gradient' as string]: cfg.gradient,
    ['--ds-score-badge-dot-glow' as string]: cfg.color,
  };
}

export function ScoreBadge({ score, showLabel = false, size = 'md' }: ScoreBadgeProps) {
  const clamp = Math.min(5, Math.max(1, Math.round(score)));
  const cfg = SCORE_CONFIG[clamp as keyof typeof SCORE_CONFIG];
  const sizeCfg = SCORE_SIZE_STYLE[size];

  return (
    <span
      className={cn(
        'ds-score-badge',
        size === 'sm' && 'ds-score-badge--sm',
        size === 'md' && 'ds-score-badge--md',
        size === 'lg' && 'ds-score-badge--lg',
      )}
      style={scoreBadgeCssVars(cfg, sizeCfg)}
      aria-label={`Score ${clamp}/5 — ${cfg.label}`}
    >
      <span className="ds-score-badge-dot" />
      {clamp}/5
      {showLabel && <span className="ds-score-badge-label">{cfg.label}</span>}
    </span>
  );
}

export function ScoreBar({ score }: { score: number }) {
  const clamp = Math.min(5, Math.max(1, Math.round(score)));
  const cfg = SCORE_CONFIG[clamp as keyof typeof SCORE_CONFIG];
  const pct = (score / 5) * 100;

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
        className="ds-scorebar-value"
        style={{ ['--ds-scorebar-value-fg' as string]: cfg.color } as CSSProperties}
      >
        {score}
      </span>
    </div>
  );
}

export function ScoreDot({ score, size = 7 }: { score: number; size?: number }) {
  const clamp = Math.min(5, Math.max(1, Math.round(score)));
  const cfg = SCORE_CONFIG[clamp as keyof typeof SCORE_CONFIG];
  return (
    <span
      className="ds-score-dot"
      style={
        {
          ['--ds-score-dot-size' as string]: `${size}px`,
          ['--ds-score-dot-gradient' as string]: cfg.gradient,
          ['--ds-score-dot-glow' as string]: cfg.color,
        } as CSSProperties
      }
    />
  );
}

export function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const clamp = Math.min(5, Math.max(1, Math.round(score)));
  const cfg = SCORE_CONFIG[clamp as keyof typeof SCORE_CONFIG];
  const strokeW = size > 60 ? 4 : 3;
  const r = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = score / 5;
  const half = size / 2;

  return (
    <svg
      width={size}
      height={size}
      className="flex-shrink-0 ds-score-ring-svg"
      style={{ ['--ds-score-ring-half' as string]: `${half}px` } as CSSProperties}
    >
      <circle cx={half} cy={half} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={strokeW} />
      <motion.circle
        cx={half}
        cy={half}
        r={r}
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
      <text
        x={half}
        y={half + 5}
        textAnchor="middle"
        fontWeight="700"
        fill={cfg.color}
        fontFamily="var(--font-mono)"
        className={cn('ds-score-ring-value', size > 60 ? 'ds-score-ring-value--lg' : 'ds-score-ring-value--sm')}
      >
        {score}
      </text>
    </svg>
  );
}
