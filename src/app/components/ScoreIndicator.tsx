import { cn } from '../components/ui/utils';
import { getScoreTone } from '../design-system/tokens/report-semantic-tokens';

interface ScoreIndicatorProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ScoreIndicator({ score, size = 'md', showLabel = false, className }: ScoreIndicatorProps) {
  const scoreTone = getScoreTone(score);
  const scoreBgClassName =
    score >= 5
      ? 'bg-[var(--score-5)]'
      : score === 4
        ? 'bg-[var(--score-4)]'
        : score === 3
          ? 'bg-[var(--score-3)]'
          : score === 2
            ? 'bg-[var(--score-2)]'
            : 'bg-[var(--score-1)]';

  const getScoreLabel = (score: number) => {
    if (score === 5) return 'Excellent';
    if (score === 4) return 'Good';
    if (score === 3) return 'Moderate';
    if (score === 2) return 'Needs Improvement';
    return 'Critical';
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base'
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-full font-semibold text-white',
          scoreBgClassName,
          sizeClasses[size]
        )}
      >
        {score}
      </div>
      {showLabel && (
        <span className={cn('text-sm font-medium', scoreTone.textClassName)}>{getScoreLabel(score)}</span>
      )}
    </div>
  );
}
