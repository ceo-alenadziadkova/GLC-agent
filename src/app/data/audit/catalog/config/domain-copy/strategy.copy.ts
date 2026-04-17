import type { CatalogDomainCopy } from './domain-copy.types';

export const strategyDomainCopy: CatalogDomainCopy = {
  id: 'strategy',
  name: 'Strategy & Roadmap',
  score: 5,
  status: 'excellent',
  executiveSummary: 'Strategic planning demonstrates exceptional clarity with well-defined objectives and comprehensive roadmap. Leadership alignment is strong with clear prioritization framework and resource allocation processes in place.',
  strengths: [
    'Clearly articulated vision and mission statements',
    'Quantified strategic objectives with KPI tracking',
    'Quarterly OKR framework in use',
    'Regular strategic review and planning sessions',
    'Cross-functional alignment on priorities',
    'Documented 3-year strategic roadmap',
    'Effective resource allocation processes',
    'Strong stakeholder communication cadence',
  ],
  weaknesses: [
    'Limited scenario planning for market disruptions',
    'Opportunity to enhance competitive intelligence integration',
    'Could benefit from more dynamic strategy adjustment mechanisms',
  ],
  issues: [
    {
      id: 'strat-1',
      severity: 'low',
      title: 'Infrequent Strategy Refresh Cycle',
      description: 'Annual strategic planning cycle may be too slow for dynamic market',
      impact: 'Potential delayed response to market shifts',
    },
  ],
  recommendations: [
    {
      id: 'strat-rec-1',
      title: 'Implement Rolling Strategic Planning',
      description: 'Move from annual to quarterly rolling strategic planning cycles',
      priority: 'medium',
      estimatedCost: '$8,000 - $12,000',
      estimatedTime: '4-6 weeks',
      impact: 'Enable more agile strategic response to market changes',
    },
    {
      id: 'strat-rec-2',
      title: 'Develop Scenario Planning Framework',
      description: 'Create systematic approach to strategic scenario analysis',
      priority: 'low',
      estimatedCost: '$10,000 - $15,000',
      estimatedTime: '6-8 weeks',
      impact: 'Improved strategic resilience and risk mitigation',
    },
  ],
  quickWins: [
    {
      id: 'strat-qw-1',
      title: 'Create Strategy Dashboard',
      description: 'Build real-time dashboard for strategic KPI tracking',
      timeframe: '5-7 days',
      effort: 'medium',
    },
  ],
  estimatedInvestment: {
    immediate: '$2,000 - $3,000',
    shortTerm: '$10,000 - $15,000',
    longTerm: '$20,000 - $30,000',
  },
};
