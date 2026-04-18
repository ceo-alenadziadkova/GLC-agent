import { Lightning, Clock } from '@phosphor-icons/react';
import type { QuickWin } from '../data/audit';
import { getEffortTone } from '../design-system/tokens/report-semantic-tokens';
import { StatusBadge } from './ui/status-badge';
import { Surface } from './ui/surface';

interface QuickWinCardProps {
  quickWin: QuickWin;
}

export function QuickWinCard({ quickWin }: QuickWinCardProps) {
  const effortTone = getEffortTone(quickWin.effort);

  return (
    <Surface className="group p-5 transition-all hover:border-[var(--score-5)]">
      {/* Icon Header */}
      <div className="flex items-start gap-4 mb-3">
        <div className="rounded-lg bg-[var(--score-5-bg)] p-2">
          <Lightning className="h-4 w-4 text-[var(--score-5)]" />
        </div>
        <div className="flex-1">
          <h4 className="mb-1 text-sm font-semibold text-[var(--text-primary)]">{quickWin.title}</h4>
          <StatusBadge label={effortTone.label} toneClassName={effortTone.badgeClassName} />
        </div>
      </div>

      {/* Description */}
      <p className="mb-3 text-sm leading-relaxed text-[var(--text-secondary)]">{quickWin.description}</p>

      {/* Timeframe */}
      <div className="flex items-center gap-2 border-t border-[var(--panel-border)] pt-3">
        <Clock className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
        <span className="text-xs font-medium text-[var(--text-secondary)]">{quickWin.timeframe}</span>
      </div>
    </Surface>
  );
}
