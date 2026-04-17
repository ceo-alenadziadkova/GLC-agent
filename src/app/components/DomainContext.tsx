import { ScoreIndicator } from './ScoreIndicator';
import type { AuditDomain } from '../data/audit';

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
    <div className="bg-card h-full border-l flex flex-col">
      {/* Header */}
      <div className="border-b p-6">
        <div className="text-muted-foreground mb-3 text-xs font-medium">
          DOMAIN SUMMARY
        </div>
        <h2 className="text-foreground mb-4 text-lg font-semibold">
          {domain.name}
        </h2>
        <ScoreIndicator score={domain.score} size="lg" showLabel />
      </div>

      {/* Status Section */}
      <div className="border-b p-6">
        <div className="text-muted-foreground mb-2 text-xs font-medium">
          STATUS
        </div>
        <div className="text-foreground mb-2 text-sm font-medium">
          {getStatusLabel(domain.status)}
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {getStatusDescription(domain.status)}
        </p>
      </div>

      {/* Metrics Summary */}
      <div className="border-b p-6">
        <div className="text-muted-foreground mb-3 text-xs font-medium">
          KEY METRICS
        </div>
        <div className="space-y-3">
          <div>
            <div className="text-muted-foreground mb-1 text-xs">
              Strengths Identified
            </div>
            <div className="text-foreground text-lg font-semibold">
              {domain.strengths.length}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1 text-xs">
              Issues Found
            </div>
            <div className="text-foreground text-lg font-semibold">
              {domain.issues.length}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1 text-xs">
              Recommendations
            </div>
            <div className="text-foreground text-lg font-semibold">
              {domain.recommendations.length}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1 text-xs">
              Quick Wins Available
            </div>
            <div className="text-foreground text-lg font-semibold">
              {domain.quickWins.length}
            </div>
          </div>
        </div>
      </div>

      {/* Investment Summary */}
      <div className="p-6">
        <div className="text-muted-foreground mb-3 text-xs font-medium">
          ESTIMATED INVESTMENT
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Immediate</span>
            <span className="text-foreground text-sm font-medium">
              {domain.estimatedInvestment.immediate}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Short Term</span>
            <span className="text-foreground text-sm font-medium">
              {domain.estimatedInvestment.shortTerm}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Long Term</span>
            <span className="text-foreground text-sm font-medium">
              {domain.estimatedInvestment.longTerm}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
