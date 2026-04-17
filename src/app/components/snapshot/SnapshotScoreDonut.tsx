import type { ReactNode } from 'react';

/**
 * Decorative donut around the numeric score. The center text is authoritative; arc length mirrors `fillPercent` only visually.
 */
export function SnapshotScoreDonut(props: {
  fillPercent: number;
  accentColor: string;
  size?: number;
  strokeWidth?: number;
  children: ReactNode;
}) {
  const { fillPercent, accentColor, size = 168, strokeWidth = 11, children } = props;
  const r = (size - strokeWidth) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, fillPercent));
  const dashOffset = circumference * (1 - pct / 100);

  return (
    <div className="relative mx-auto flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
        aria-hidden
      >
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={accentColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="[transition:stroke-dashoffset_0.75s_cubic-bezier(0.16,1,0.3,1)]"
        />
      </svg>
      <div className="relative z-[1] flex flex-col items-center justify-center px-2 text-center">{children}</div>
    </div>
  );
}
