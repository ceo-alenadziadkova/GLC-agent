import { Lightning, Clock } from '@phosphor-icons/react';
import type { QuickWin } from '../data/auditData';
import { cn } from './ui/utils';

interface QuickWinCardProps {
  quickWin: QuickWin;
}

export function QuickWinCard({ quickWin }: QuickWinCardProps) {
  const getEffortBadge = (effort: string) => {
    const styles: Record<string, { bg: string; color: string; text: string }> = {
      low: { bg: 'var(--score-5-bg)', color: 'var(--score-5)', text: 'Low Effort' },
      medium: { bg: 'var(--score-3-bg)', color: 'var(--score-3)', text: 'Medium Effort' },
      high: { bg: 'var(--score-1-bg)', color: 'var(--score-1)', text: 'High Effort' }
    };

    const style = styles[effort] || styles.low;

    return (
      <span
        className="inline-flex items-center px-2 py-1 text-xs font-medium rounded"
        style={{ backgroundColor: style.bg, color: style.color }}
      >
        {style.text}
      </span>
    );
  };

  return (
    <div
      className="p-5 rounded-lg border bg-[var(--bg-surface)] hover:border-[var(--status-excellent)] transition-all group"
      style={{ borderColor: 'var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Icon Header */}
      <div className="flex items-start gap-4 mb-3">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: 'var(--score-5-bg)' }}
        >
          <Lightning className="w-4 h-4" style={{ color: 'var(--status-excellent)' }} />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
            {quickWin.title}
          </h4>
          {getEffortBadge(quickWin.effort)}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {quickWin.description}
      </p>

      {/* Timeframe */}
      <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: 'var(--panel-border)' }}>
        <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          {quickWin.timeframe}
        </span>
      </div>
    </div>
  );
}
