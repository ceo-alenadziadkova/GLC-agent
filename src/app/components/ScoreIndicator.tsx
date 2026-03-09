import { cn } from '../components/ui/utils';

interface ScoreIndicatorProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ScoreIndicator({ score, size = 'md', showLabel = false, className }: ScoreIndicatorProps) {
  const getScoreColor = (score: number) => {
    if (score >= 4) return 'var(--status-excellent)';
    if (score === 3) return 'var(--status-moderate)';
    if (score === 2) return 'var(--status-needs-improvement)';
    return 'var(--status-critical)';
  };

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
          'rounded-full flex items-center justify-center font-semibold text-white',
          sizeClasses[size]
        )}
        style={{ backgroundColor: getScoreColor(score) }}
      >
        {score}
      </div>
      {showLabel && (
        <span className="text-sm font-medium" style={{ color: getScoreColor(score) }}>
          {getScoreLabel(score)}
        </span>
      )}
    </div>
  );
}
