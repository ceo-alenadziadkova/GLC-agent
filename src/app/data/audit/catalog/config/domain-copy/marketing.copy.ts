import type { CatalogDomainCopy } from './domain-copy.types';

export const marketingDomainCopy: CatalogDomainCopy = {
  id: 'marketing',
  name: 'Marketing & Positioning',
  score: 4,
  status: 'good',
  executiveSummary: 'Marketing strategy demonstrates strong brand positioning with consistent messaging across channels. Campaign performance metrics exceed industry benchmarks with opportunities for enhanced attribution and automation.',
  strengths: [
    'Clear value proposition and brand messaging',
    'Multi-channel marketing strategy in execution',
    'Strong content marketing foundation',
    'Effective email marketing with healthy engagement rates',
    'Active social media presence with growing audience',
    'Marketing automation platform in use',
  ],
  weaknesses: [
    'Incomplete multi-touch attribution model',
    'Limited account-based marketing (ABM) capabilities',
    'Insufficient marketing-sales alignment on lead scoring',
    'Gaps in customer lifecycle marketing',
  ],
  issues: [
    {
      id: 'mkt-1',
      severity: 'medium',
      title: 'Attribution Gaps in Customer Journey',
      description: 'Unable to accurately track ROI across all marketing touchpoints',
      impact: 'Suboptimal budget allocation and missed optimization opportunities',
    },
    {
      id: 'mkt-2',
      severity: 'medium',
      title: 'Limited Marketing-Sales Handoff Process',
      description: 'Lack of standardized lead qualification and handoff procedures',
      impact: 'Lead leakage and sales team inefficiency',
    },
  ],
  recommendations: [
    {
      id: 'mkt-rec-1',
      title: 'Implement Multi-Touch Attribution Model',
      description: 'Deploy advanced attribution tracking across all marketing channels',
      priority: 'high',
      estimatedCost: '$20,000 - $30,000',
      estimatedTime: '6-8 weeks',
      impact: 'Improve marketing ROI by 25% through optimized budget allocation',
    },
    {
      id: 'mkt-rec-2',
      title: 'Deploy Account-Based Marketing Platform',
      description: 'Implement ABM strategy for enterprise customer acquisition',
      priority: 'medium',
      estimatedCost: '$25,000 - $40,000',
      estimatedTime: '8-10 weeks',
      impact: 'Increase enterprise deal closure rate by 30%',
    },
  ],
  quickWins: [
    {
      id: 'mkt-qw-1',
      title: 'Standardize UTM Tracking',
      description: 'Implement consistent UTM parameter strategy across all campaigns',
      timeframe: '2-3 days',
      effort: 'low',
    },
    {
      id: 'mkt-qw-2',
      title: 'Create Lead Scoring Model',
      description: 'Define basic lead scoring criteria for sales handoff',
      timeframe: '5-7 days',
      effort: 'medium',
    },
  ],
  estimatedInvestment: {
    immediate: '$3,000 - $6,000',
    shortTerm: '$25,000 - $40,000',
    longTerm: '$50,000 - $80,000',
  },
};
