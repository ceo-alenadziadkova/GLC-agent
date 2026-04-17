import { cn } from './ui/utils';
import { motion } from 'motion/react';

interface ProgressBarProps {
  value: number;
  max?: number;
  toneClassName?: string;
  heightClassName?: string;
  showLabel?: boolean;
}

export function ProgressBar({ 
  value, 
  max = 5, 
  toneClassName = 'bg-[var(--score-5)]',
  heightClassName = 'h-2',
  showLabel = false 
}: ProgressBarProps) {
  const percentage = (value / max) * 100;

  return (
    <div>
      {showLabel && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Progress
          </span>
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            {value}/{max}
          </span>
        </div>
      )}
      <div className={cn('w-full overflow-hidden rounded-full bg-[var(--surface)]', heightClassName)}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn('h-full rounded-full', toneClassName)}
        />
      </div>
    </div>
  );
}
