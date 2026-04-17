import { ScoreIndicator } from './ScoreIndicator';
import { ProgressBar } from './ProgressBar';
import type { AuditDomain } from '../data/audit';
import { Surface } from './ui/surface';
import { getScoreTone } from '../design-system/tokens/report-semantic-tokens';

interface ScorecardOverviewProps {
  domain: AuditDomain;
}

export function ScorecardOverview({ domain }: ScorecardOverviewProps) {
  const scoreTone = getScoreTone(domain.score);
  const metrics = [
    { label: 'Strengths Identified', value: domain.strengths.length, color: 'text-[var(--score-5)]' },
    { label: 'Weaknesses Found', value: domain.weaknesses.length, color: 'text-[var(--text-secondary)]' },
    { label: 'Critical Issues', value: domain.issues.filter(i => i.severity === 'critical').length, color: 'text-[var(--score-1)]' },
    { label: 'Recommendations', value: domain.recommendations.length, color: 'text-[var(--text-primary)]' },
  ];

  return (
    <section className="mb-12">
      <div className="mb-4 text-xs font-semibold tracking-wide text-[var(--text-tertiary)]">
        SCORECARD OVERVIEW
      </div>

      <Surface padding="lg" className="bg-[var(--surface)]">
        <div className="flex items-center gap-6 mb-6">
          <ScoreIndicator score={domain.score} size="lg" />
          <div className="flex-1">
            <div className="mb-2 text-sm text-[var(--text-tertiary)]">
              Overall Score
            </div>
            <div className="mb-3 text-2xl font-semibold text-[var(--text-primary)]">
              {domain.score}/5
            </div>
            <ProgressBar value={domain.score} max={5} toneClassName={scoreTone.textClassName} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <div className="mb-2 text-xs text-[var(--text-tertiary)]">
                {metric.label}
              </div>
              <div className={`text-2xl font-semibold ${metric.color}`}>{metric.value}</div>
            </div>
          ))}
        </div>
      </Surface>
    </section>
  );
}