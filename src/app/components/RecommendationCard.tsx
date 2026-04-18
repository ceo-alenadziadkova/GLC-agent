import { ArrowUpRight, Clock, CurrencyDollar, TrendUp } from '@phosphor-icons/react';
import type { Recommendation } from '../data/audit';
import { getPriorityTone } from '../design-system/tokens/report-semantic-tokens';
import { StatusBadge } from './ui/status-badge';
import { Surface } from './ui/surface';

interface RecommendationCardProps {
  recommendation: Recommendation;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const priorityTone = getPriorityTone(recommendation.priority);

  return (
    <Surface padding="lg" className="transition-all hover:shadow-[var(--shadow-md)]">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-semibold text-[var(--text-primary)]">{recommendation.title}</h4>
            <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-[var(--text-tertiary)]" />
          </div>
          <StatusBadge label={priorityTone.label} toneClassName={priorityTone.badgeClassName} />
        </div>
      </div>

      {/* Description */}
      <p className="mb-4 text-sm leading-relaxed text-[var(--text-secondary)]">{recommendation.description}</p>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 border-t border-[var(--panel-border)] pt-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            <span className="text-xs text-[var(--text-tertiary)]">Timeline</span>
          </div>
          <div className="text-sm font-medium text-[var(--text-primary)]">{recommendation.estimatedTime}</div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <CurrencyDollar className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            <span className="text-xs text-[var(--text-tertiary)]">Investment</span>
          </div>
          <div className="text-sm font-medium text-[var(--text-primary)]">{recommendation.estimatedCost}</div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendUp className="h-3.5 w-3.5 text-[var(--score-5)]" />
            <span className="text-xs text-[var(--text-tertiary)]">Impact</span>
          </div>
          <div className="text-sm font-medium text-[var(--text-primary)]">{recommendation.impact}</div>
        </div>
      </div>
    </Surface>
  );
}
