import { ArrowUpRight, Clock, DollarSign, TrendingUp } from 'lucide-react';
import type { Recommendation } from '../data/auditData';

interface RecommendationCardProps {
  recommendation: Recommendation;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'var(--status-critical)';
      case 'medium':
        return 'var(--status-moderate)';
      default:
        return 'var(--text-secondary)';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      high: { bg: '#FFF1F0', text: 'High Priority' },
      medium: { bg: '#FFFBEB', text: 'Medium Priority' },
      low: { bg: 'var(--surface)', text: 'Low Priority' }
    };

    const style = styles[priority] || styles.low;

    return (
      <span
        className="inline-flex items-center px-2 py-1 text-xs font-medium rounded"
        style={{ backgroundColor: style.bg, color: getPriorityColor(priority) }}
      >
        {style.text}
      </span>
    );
  };

  return (
    <div
      className="p-6 rounded-lg border bg-white hover:shadow-md transition-all"
      style={{ borderColor: 'var(--panel-border)', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {recommendation.title}
            </h4>
            <ArrowUpRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
          </div>
          {getPriorityBadge(recommendation.priority)}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {recommendation.description}
      </p>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t" style={{ borderColor: 'var(--panel-border)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Timeline</span>
          </div>
          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {recommendation.estimatedTime}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Investment</span>
          </div>
          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {recommendation.estimatedCost}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--status-excellent)' }} />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Impact</span>
          </div>
          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {recommendation.impact}
          </div>
        </div>
      </div>
    </div>
  );
}
