import type { CatalogDomainCopy } from './domain-copy.types';

export const reconDomainCopy: CatalogDomainCopy = {
  id: 'recon',
  name: 'Recon',
  score: 4,
  status: 'good',
  executiveSummary: 'Initial reconnaissance reveals a well-structured digital footprint with clear brand positioning. Market analysis shows strong competitive awareness with room for enhanced data collection methodologies.',
  strengths: [
    'Comprehensive competitor analysis framework in place',
    'Strong brand presence across primary digital channels',
    'Effective market positioning with clear value proposition',
    'Robust customer intelligence gathering mechanisms',
  ],
  weaknesses: [
    'Limited integration between reconnaissance tools and CRM systems',
    'Insufficient automation in market intelligence gathering',
    'Gaps in competitive pricing intelligence',
  ],
  issues: [
    {
      id: 'recon-1',
      severity: 'medium',
      title: 'Fragmented Intelligence Systems',
      description: 'Market intelligence data is scattered across multiple tools without centralized aggregation',
      impact: 'Delayed decision-making and potential missed market opportunities',
    },
    {
      id: 'recon-2',
      severity: 'low',
      title: 'Manual Competitor Tracking',
      description: 'Competitor activity monitoring relies heavily on manual processes',
      impact: 'Resource-intensive with potential for human error and oversight',
    },
  ],
  recommendations: [
    {
      id: 'recon-rec-1',
      title: 'Implement Intelligence Aggregation Platform',
      description: 'Deploy centralized business intelligence platform to consolidate market data from all sources',
      priority: 'high',
      estimatedCost: '$15,000 - $25,000',
      estimatedTime: '6-8 weeks',
      impact: 'Reduce intelligence gathering time by 60% and improve data accuracy',
    },
    {
      id: 'recon-rec-2',
      title: 'Automate Competitor Monitoring',
      description: 'Implement automated tracking systems for competitor pricing, positioning, and digital presence',
      priority: 'medium',
      estimatedCost: '$8,000 - $12,000',
      estimatedTime: '3-4 weeks',
      impact: 'Real-time competitive intelligence with automated alerts',
    },
  ],
  quickWins: [
    {
      id: 'recon-qw-1',
      title: 'Consolidate Intelligence Dashboard',
      description: 'Create unified view of existing intelligence tools using BI platform',
      timeframe: '3-5 days',
      effort: 'low',
    },
    {
      id: 'recon-qw-2',
      title: 'Set Up Google Alerts',
      description: 'Configure comprehensive alert system for competitor and market activity',
      timeframe: '1-2 days',
      effort: 'low',
    },
  ],
  estimatedInvestment: {
    immediate: '$2,000 - $5,000',
    shortTerm: '$15,000 - $25,000',
    longTerm: '$30,000 - $50,000',
  },
};
