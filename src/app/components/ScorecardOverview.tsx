import { ScoreIndicator } from './ScoreIndicator';
import { ProgressBar } from './ProgressBar';
import type { AuditDomain } from '../data/auditData';

interface ScorecardOverviewProps {
  domain: AuditDomain;
}

export function ScorecardOverview({ domain }: ScorecardOverviewProps) {
  const metrics = [
    { label: 'Strengths Identified', value: domain.strengths.length, color: 'var(--status-excellent)' },
    { label: 'Weaknesses Found', value: domain.weaknesses.length, color: 'var(--text-secondary)' },
    { label: 'Critical Issues', value: domain.issues.filter(i => i.severity === 'critical').length, color: 'var(--status-critical)' },
    { label: 'Recommendations', value: domain.recommendations.length, color: 'var(--text-primary)' },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'var(--status-excellent)';
    if (score === 3) return 'var(--status-moderate)';
    if (score === 2) return 'var(--status-needs-improvement)';
    return 'var(--status-critical)';
  };

  return (
    <section className="mb-12">
      <div className="text-xs font-semibold tracking-wide mb-4" style={{ color: 'var(--text-tertiary)' }}>
        SCORECARD OVERVIEW
      </div>
      
      <div 
        className="p-6 rounded-lg" 
        style={{ 
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--panel-border)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div className="flex items-center gap-6 mb-6">
          <ScoreIndicator score={domain.score} size="lg" />
          <div className="flex-1">
            <div className="text-sm mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Overall Score
            </div>
            <div className="text-2xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              {domain.score}/5
            </div>
            <ProgressBar value={domain.score} max={5} color={getScoreColor(domain.score)} />
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <div className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
                {metric.label}
              </div>
              <div className="text-2xl font-semibold" style={{ color: metric.color }}>
                {metric.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}