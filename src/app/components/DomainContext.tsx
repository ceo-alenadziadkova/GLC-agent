import { ScoreIndicator } from './ScoreIndicator';
import type { AuditDomain } from '../data/auditData';

interface DomainContextProps {
  domain: AuditDomain;
}

export function DomainContext({ domain }: DomainContextProps) {
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'excellent': 'Excellent',
      'good': 'Good Performance',
      'moderate': 'Needs Improvement',
      'needs-improvement': 'Requires Attention',
      'critical': 'Critical Priority'
    };
    return labels[status] || status;
  };

  const getStatusDescription = (status: string) => {
    const descriptions: Record<string, string> = {
      'excellent': 'This domain demonstrates exceptional performance with best practices fully implemented.',
      'good': 'Strong performance with minor optimization opportunities identified.',
      'moderate': 'Adequate foundation with strategic improvements recommended.',
      'needs-improvement': 'Immediate attention required to address identified gaps.',
      'critical': 'Critical vulnerabilities requiring urgent remediation.'
    };
    return descriptions[status] || 'Assessment complete.';
  };

  return (
    <div className="h-full bg-[var(--bg-surface)] border-l flex flex-col" style={{ borderColor: 'var(--panel-border)' }}>
      {/* Header */}
      <div className="p-6 border-b" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="text-xs font-medium mb-3" style={{ color: 'var(--text-tertiary)' }}>
          DOMAIN SUMMARY
        </div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          {domain.name}
        </h2>
        <ScoreIndicator score={domain.score} size="lg" showLabel />
      </div>

      {/* Status Section */}
      <div className="p-6 border-b" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
          STATUS
        </div>
        <div className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          {getStatusLabel(domain.status)}
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {getStatusDescription(domain.status)}
        </p>
      </div>

      {/* Metrics Summary */}
      <div className="p-6 border-b" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="text-xs font-medium mb-3" style={{ color: 'var(--text-tertiary)' }}>
          KEY METRICS
        </div>
        <div className="space-y-3">
          <div>
            <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
              Strengths Identified
            </div>
            <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {domain.strengths.length}
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
              Issues Found
            </div>
            <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {domain.issues.length}
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
              Recommendations
            </div>
            <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {domain.recommendations.length}
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
              Quick Wins Available
            </div>
            <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {domain.quickWins.length}
            </div>
          </div>
        </div>
      </div>

      {/* Investment Summary */}
      <div className="p-6">
        <div className="text-xs font-medium mb-3" style={{ color: 'var(--text-tertiary)' }}>
          ESTIMATED INVESTMENT
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Immediate</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {domain.estimatedInvestment.immediate}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Short Term</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {domain.estimatedInvestment.shortTerm}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Long Term</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {domain.estimatedInvestment.longTerm}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
