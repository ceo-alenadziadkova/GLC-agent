import type { CatalogDomainCopy } from './domain-copy.types';

export const uxDomainCopy: CatalogDomainCopy = {
  id: 'ux',
  name: 'UX & Conversion',
  score: 4,
  status: 'good',
  executiveSummary: 'User experience demonstrates strong foundational design principles with clear conversion paths. Analytics indicate healthy engagement metrics with targeted opportunities for conversion rate optimization.',
  strengths: [
    'Intuitive navigation with clear information architecture',
    'Fast page load times (< 2 seconds)',
    'Mobile-first responsive design',
    'Clear call-to-action placement and hierarchy',
    'A/B testing framework in place',
    'Comprehensive analytics implementation',
  ],
  weaknesses: [
    'Limited personalization based on user behavior',
    'Checkout process has 3-step friction points',
    'Insufficient social proof and trust signals',
    'Limited progressive profiling in forms',
  ],
  issues: [
    {
      id: 'ux-1',
      severity: 'medium',
      title: 'Cart Abandonment Rate Above Industry Average',
      description: '68% cart abandonment rate vs. 60% industry benchmark',
      impact: 'Estimated $120K annual revenue loss',
    },
    {
      id: 'ux-2',
      severity: 'low',
      title: 'Form Completion Rates Below Optimal',
      description: 'Lead forms showing 45% completion rate vs. 60% target',
      impact: 'Missed lead generation opportunities',
    },
  ],
  recommendations: [
    {
      id: 'ux-rec-1',
      title: 'Optimize Checkout Flow',
      description: 'Streamline checkout process to single-page with guest checkout option',
      priority: 'high',
      estimatedCost: '$18,000 - $25,000',
      estimatedTime: '4-6 weeks',
      impact: 'Projected 15-20% reduction in cart abandonment',
    },
    {
      id: 'ux-rec-2',
      title: 'Implement Smart Form Optimization',
      description: 'Deploy progressive profiling and smart field validation',
      priority: 'medium',
      estimatedCost: '$10,000 - $15,000',
      estimatedTime: '3-4 weeks',
      impact: 'Increase form completion by 25%',
    },
  ],
  quickWins: [
    {
      id: 'ux-qw-1',
      title: 'Add Trust Badges to Checkout',
      description: 'Display security and payment badges prominently',
      timeframe: '1-2 days',
      effort: 'low',
    },
    {
      id: 'ux-qw-2',
      title: 'Implement Exit-Intent Popups',
      description: 'Deploy targeted exit-intent offers for cart abandonment',
      timeframe: '2-3 days',
      effort: 'low',
    },
  ],
  estimatedInvestment: {
    immediate: '$2,000 - $4,000',
    shortTerm: '$20,000 - $30,000',
    longTerm: '$40,000 - $60,000',
  },
};
