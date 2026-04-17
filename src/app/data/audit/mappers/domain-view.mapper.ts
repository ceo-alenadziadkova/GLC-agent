import type { DomainKey, DomainData, StrategyRoadmap } from '../../auditTypes';
import { DOMAIN_LABELS } from '../../auditTypes';
import type { AuditDomain, StrategyInitiative } from '../contracts/report-types';

const SCORE_TO_STATUS: Record<number, AuditDomain['status']> = {
  1: 'critical',
  2: 'needs-improvement',
  3: 'moderate',
  4: 'good',
  5: 'excellent',
};

function toStatus(score: number | null): AuditDomain['status'] {
  if (typeof score !== 'number') return 'moderate';
  const normalized = Math.max(1, Math.min(5, Math.round(score)));
  return SCORE_TO_STATUS[normalized];
}

function toStrategyInitiative(
  item: StrategyRoadmap['quick_wins'][number],
  timeframe: StrategyInitiative['timeframe'],
): StrategyInitiative {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    timeframe,
    impact: item.impact,
    effort: item.effort,
    dependencies: item.dependencies,
  };
}

export function mapDomainDataToAuditDomain(domain: DomainData): AuditDomain {
  return {
    id: domain.domain_key,
    name: DOMAIN_LABELS[domain.domain_key],
    icon: 'Circle',
    score: domain.score ?? 0,
    status: toStatus(domain.score),
    executiveSummary: domain.summary ?? '',
    strengths: domain.strengths ?? [],
    weaknesses: domain.weaknesses ?? [],
    issues: (domain.issues ?? []).map((issue) => ({
      id: issue.id,
      severity: issue.severity,
      title: issue.title,
      description: issue.description,
      impact: issue.impact,
    })),
    recommendations: (domain.recommendations ?? []).map((recommendation) => ({
      id: recommendation.id,
      title: recommendation.title,
      description: recommendation.description,
      priority: recommendation.priority,
      estimatedCost: recommendation.estimated_cost,
      estimatedTime: recommendation.estimated_time,
      impact: recommendation.impact,
    })),
    quickWins: (domain.quick_wins ?? []).map((quickWin) => ({
      id: quickWin.id,
      title: quickWin.title,
      description: quickWin.description,
      timeframe: quickWin.timeframe,
      effort: quickWin.effort,
    })),
    estimatedInvestment: {
      immediate: 'N/A',
      shortTerm: 'N/A',
      longTerm: 'N/A',
    },
  };
}

export function mapDomainsRecordToAuditDomains(
  domains: Record<DomainKey, DomainData | null>,
): AuditDomain[] {
  return Object.values(domains)
    .filter((domain): domain is DomainData => domain !== null)
    .map(mapDomainDataToAuditDomain);
}

export function mapStrategyRoadmapToInitiatives(strategy: StrategyRoadmap | null): StrategyInitiative[] {
  if (!strategy) return [];
  return [
    ...strategy.quick_wins.map((item) => toStrategyInitiative(item, 'quick-win')),
    ...strategy.medium_term.map((item) => toStrategyInitiative(item, 'medium-term')),
    ...strategy.strategic.map((item) => toStrategyInitiative(item, 'strategic')),
  ];
}
