import { motion } from 'motion/react';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: string;
  showLabel?: boolean;
}

export function ProgressBar({ 
  value, 
  max = 5, 
  color = 'var(--status-excellent)',
  height = '8px',
  showLabel = false 
}: ProgressBarProps) {
  const percentage = (value / max) * 100;

  return (
    <div>
      {showLabel && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Progress
          </span>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            {value}/{max}
          </span>
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{
          backgroundColor: 'var(--surface)',
          height
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}
