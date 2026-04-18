import { Badge } from './badge';
import { cn } from './utils';

export const STATUS_BADGE_TONE_CLASS = {
  neutral: 'border-[var(--border-subtle)] bg-[var(--bg-muted)] text-[var(--text-tertiary)]',
  info: 'border-[var(--callout-info-border)] bg-[var(--glc-blue-xlight)] text-[var(--glc-blue-deeper)]',
  success: 'border-[var(--score-5-border)] bg-[var(--glc-green-xlight)] text-[var(--glc-green-dark)]',
  warning: 'border-[var(--score-3-border)] bg-[var(--callout-warning-pill-bg)] text-[var(--callout-warning-fg)]',
  danger: 'border-[var(--score-1-border)] bg-[var(--score-1-bg)] text-[var(--score-1)]',
} as const;

export type StatusBadgeTone = keyof typeof STATUS_BADGE_TONE_CLASS;

interface StatusBadgeProps {
  label: string;
  toneClassName?: string;
  tone?: StatusBadgeTone;
  dotClassName?: string;
  pulse?: boolean;
  pulseClassName?: string;
  className?: string;
}

export function StatusBadge({
  label,
  toneClassName,
  tone = 'neutral',
  dotClassName,
  pulse = false,
  pulseClassName,
  className,
}: StatusBadgeProps) {
  const resolvedToneClassName = toneClassName ?? STATUS_BADGE_TONE_CLASS[tone];
  return (
    <Badge
      variant="secondary"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[var(--text-xs)] font-medium tracking-[var(--tracking-normal)]',
        resolvedToneClassName,
        className,
      )}
    >
      {dotClassName ? (
        <span className="relative inline-flex h-[var(--space-1-5)] w-[var(--space-1-5)] flex-shrink-0 rounded-full">
          {pulse ? (
            <span
              className={cn(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-50',
                pulseClassName ?? dotClassName,
              )}
            />
          ) : null}
          <span className={cn('relative h-full w-full rounded-full', dotClassName)} />
        </span>
      ) : null}
      {label}
    </Badge>
  );
}
