import type { CatalogDomainCopy } from './domain-copy.types';

export const seoDomainCopy: CatalogDomainCopy = {
  id: 'seo',
  name: 'SEO & Digital Presence',
  score: 3,
  status: 'moderate',
  executiveSummary: 'Digital presence demonstrates solid foundational SEO practices with opportunities for strategic enhancement. Technical SEO is adequate but content optimization and backlink profile require strategic investment.',
  strengths: [
    'Clean site architecture with logical URL structure',
    'Mobile-responsive design with fast page load times',
    'Regular content publication schedule',
    'Basic keyword targeting implementation',
    'Google Search Console and Analytics properly configured',
  ],
  weaknesses: [
    'Limited high-authority backlink acquisition',
    'Inconsistent metadata optimization across pages',
    'Lack of structured data implementation',
    'Insufficient local SEO optimization',
    'Limited content depth on key commercial pages',
  ],
  issues: [
    {
      id: 'seo-1',
      severity: 'medium',
      title: 'Weak Backlink Profile',
      description: 'Limited number of high-quality backlinks from authoritative domains',
      impact: 'Reduced domain authority and organic search visibility',
    },
    {
      id: 'seo-2',
      severity: 'medium',
      title: 'Missing Schema Markup',
      description: 'No structured data implementation for enhanced search results',
      impact: 'Lost opportunities for rich snippets and improved CTR',
    },
    {
      id: 'seo-3',
      severity: 'low',
      title: 'Inconsistent Internal Linking',
      description: 'Suboptimal internal linking structure for SEO value distribution',
      impact: 'Reduced crawl efficiency and PageRank distribution',
    },
  ],
  recommendations: [
    {
      id: 'seo-rec-1',
      title: 'Implement Comprehensive Schema Markup',
      description: 'Deploy structured data across all page types for enhanced SERP features',
      priority: 'high',
      estimatedCost: '$8,000 - $12,000',
      estimatedTime: '3-4 weeks',
      impact: 'Improve click-through rates by 20-30% via rich snippets',
    },
    {
      id: 'seo-rec-2',
      title: 'Execute Strategic Link Building Campaign',
      description: 'Develop high-quality backlink acquisition strategy with content partnerships',
      priority: 'medium',
      estimatedCost: '$15,000 - $25,000',
      estimatedTime: '3-6 months',
      impact: 'Increase domain authority and organic traffic by 40%',
    },
  ],
  quickWins: [
    {
      id: 'seo-qw-1',
      title: 'Optimize Page Titles and Meta Descriptions',
      description: 'Update all primary pages with optimized metadata',
      timeframe: '3-5 days',
      effort: 'low',
    },
    {
      id: 'seo-qw-2',
      title: 'Add Organization Schema',
      description: 'Implement basic organization schema markup',
      timeframe: '1-2 days',
      effort: 'low',
    },
  ],
  estimatedInvestment: {
    immediate: '$3,000 - $5,000',
    shortTerm: '$15,000 - $25,000',
    longTerm: '$30,000 - $50,000',
  },
};
