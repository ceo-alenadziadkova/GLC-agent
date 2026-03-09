export interface AuditIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedCost: string;
  estimatedTime: string;
  impact: string;
}

export interface QuickWin {
  id: string;
  title: string;
  description: string;
  timeframe: string;
  effort: 'low' | 'medium' | 'high';
}

export interface StrategyInitiative {
  id: string;
  title: string;
  description: string;
  timeframe: 'quick-win' | 'medium-term' | 'strategic';
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  dependencies?: string[];
}

export interface AuditDomain {
  id: string;
  name: string;
  icon: string;
  score: number;
  status: 'excellent' | 'good' | 'moderate' | 'needs-improvement' | 'critical';
  executiveSummary: string;
  strengths: string[];
  weaknesses: string[];
  issues: AuditIssue[];
  recommendations: Recommendation[];
  quickWins: QuickWin[];
  estimatedInvestment: {
    immediate: string;
    shortTerm: string;
    longTerm: string;
  };
}

export const auditDomains: AuditDomain[] = [
  {
    id: 'recon',
    name: 'Recon',
    icon: 'Search',
    score: 4,
    status: 'good',
    executiveSummary: 'Initial reconnaissance reveals a well-structured digital footprint with clear brand positioning. Market analysis shows strong competitive awareness with room for enhanced data collection methodologies.',
    strengths: [
      'Comprehensive competitor analysis framework in place',
      'Strong brand presence across primary digital channels',
      'Effective market positioning with clear value proposition',
      'Robust customer intelligence gathering mechanisms'
    ],
    weaknesses: [
      'Limited integration between reconnaissance tools and CRM systems',
      'Insufficient automation in market intelligence gathering',
      'Gaps in competitive pricing intelligence'
    ],
    issues: [
      {
        id: 'recon-1',
        severity: 'medium',
        title: 'Fragmented Intelligence Systems',
        description: 'Market intelligence data is scattered across multiple tools without centralized aggregation',
        impact: 'Delayed decision-making and potential missed market opportunities'
      },
      {
        id: 'recon-2',
        severity: 'low',
        title: 'Manual Competitor Tracking',
        description: 'Competitor activity monitoring relies heavily on manual processes',
        impact: 'Resource-intensive with potential for human error and oversight'
      }
    ],
    recommendations: [
      {
        id: 'recon-rec-1',
        title: 'Implement Intelligence Aggregation Platform',
        description: 'Deploy centralized business intelligence platform to consolidate market data from all sources',
        priority: 'high',
        estimatedCost: '$15,000 - $25,000',
        estimatedTime: '6-8 weeks',
        impact: 'Reduce intelligence gathering time by 60% and improve data accuracy'
      },
      {
        id: 'recon-rec-2',
        title: 'Automate Competitor Monitoring',
        description: 'Implement automated tracking systems for competitor pricing, positioning, and digital presence',
        priority: 'medium',
        estimatedCost: '$8,000 - $12,000',
        estimatedTime: '3-4 weeks',
        impact: 'Real-time competitive intelligence with automated alerts'
      }
    ],
    quickWins: [
      {
        id: 'recon-qw-1',
        title: 'Consolidate Intelligence Dashboard',
        description: 'Create unified view of existing intelligence tools using BI platform',
        timeframe: '3-5 days',
        effort: 'low'
      },
      {
        id: 'recon-qw-2',
        title: 'Set Up Google Alerts',
        description: 'Configure comprehensive alert system for competitor and market activity',
        timeframe: '1-2 days',
        effort: 'low'
      }
    ],
    estimatedInvestment: {
      immediate: '$2,000 - $5,000',
      shortTerm: '$15,000 - $25,000',
      longTerm: '$30,000 - $50,000'
    }
  },
  {
    id: 'tech-infrastructure',
    name: 'Tech Infrastructure',
    icon: 'Server',
    score: 3,
    status: 'moderate',
    executiveSummary: 'Technical infrastructure demonstrates adequate foundational capabilities but reveals critical scalability constraints and modernization needs. Current architecture requires strategic upgrades to support growth objectives.',
    strengths: [
      'Stable production environment with 99.5% uptime',
      'Adequate basic monitoring and alerting systems',
      'Documented infrastructure components and dependencies',
      'Regular backup procedures in place'
    ],
    weaknesses: [
      'Legacy monolithic architecture limiting scalability',
      'Insufficient containerization and orchestration',
      'Limited disaster recovery testing and documentation',
      'Outdated technology stack components requiring modernization',
      'Inadequate load balancing and auto-scaling capabilities'
    ],
    issues: [
      {
        id: 'tech-1',
        severity: 'critical',
        title: 'Scalability Bottleneck in Database Layer',
        description: 'Current database configuration cannot handle projected 3x traffic growth',
        impact: 'Risk of system degradation during peak load periods'
      },
      {
        id: 'tech-2',
        severity: 'high',
        title: 'Outdated Runtime Environment',
        description: 'Application servers running on end-of-life software versions',
        impact: 'Security vulnerabilities and compatibility issues with modern tools'
      },
      {
        id: 'tech-3',
        severity: 'medium',
        title: 'Insufficient Infrastructure as Code',
        description: 'Manual configuration processes for infrastructure provisioning',
        impact: 'Slow deployment cycles and configuration drift'
      }
    ],
    recommendations: [
      {
        id: 'tech-rec-1',
        title: 'Migrate to Microservices Architecture',
        description: 'Decompose monolithic application into scalable microservices with containerization',
        priority: 'high',
        estimatedCost: '$80,000 - $120,000',
        estimatedTime: '4-6 months',
        impact: 'Enable horizontal scaling and independent service deployment'
      },
      {
        id: 'tech-rec-2',
        title: 'Implement Infrastructure as Code',
        description: 'Adopt Terraform/CloudFormation for declarative infrastructure management',
        priority: 'high',
        estimatedCost: '$25,000 - $40,000',
        estimatedTime: '6-8 weeks',
        impact: 'Reduce deployment time by 70% and eliminate configuration drift'
      },
      {
        id: 'tech-rec-3',
        title: 'Upgrade Database Infrastructure',
        description: 'Implement database clustering and read replicas for improved performance',
        priority: 'high',
        estimatedCost: '$35,000 - $50,000',
        estimatedTime: '8-10 weeks',
        impact: 'Support 5x traffic growth with improved query performance'
      }
    ],
    quickWins: [
      {
        id: 'tech-qw-1',
        title: 'Update Runtime Dependencies',
        description: 'Upgrade to current LTS versions of runtime environments',
        timeframe: '5-7 days',
        effort: 'medium'
      },
      {
        id: 'tech-qw-2',
        title: 'Implement Database Connection Pooling',
        description: 'Configure connection pooling to optimize database resource usage',
        timeframe: '2-3 days',
        effort: 'low'
      }
    ],
    estimatedInvestment: {
      immediate: '$10,000 - $15,000',
      shortTerm: '$50,000 - $80,000',
      longTerm: '$120,000 - $180,000'
    }
  },
  {
    id: 'security',
    name: 'Security & Compliance',
    icon: 'Shield',
    score: 2,
    status: 'needs-improvement',
    executiveSummary: 'Security posture requires immediate attention with multiple high-priority vulnerabilities identified. Compliance framework exists but lacks comprehensive implementation and regular audit procedures.',
    strengths: [
      'Basic SSL/TLS encryption in place',
      'Password complexity requirements enforced',
      'Regular security awareness training for staff',
      'Incident response plan documented'
    ],
    weaknesses: [
      'No multi-factor authentication implementation',
      'Insufficient penetration testing and vulnerability assessments',
      'Lack of comprehensive security information and event management (SIEM)',
      'Incomplete data classification and handling procedures',
      'Limited security automation and orchestration'
    ],
    issues: [
      {
        id: 'sec-1',
        severity: 'critical',
        title: 'Missing Multi-Factor Authentication',
        description: 'MFA not enforced for administrative and privileged accounts',
        impact: 'High risk of unauthorized access and account compromise'
      },
      {
        id: 'sec-2',
        severity: 'critical',
        title: 'Unpatched Security Vulnerabilities',
        description: 'Multiple CVEs identified in production dependencies',
        impact: 'Active exploitation risk for known vulnerabilities'
      },
      {
        id: 'sec-3',
        severity: 'high',
        title: 'Insufficient Access Controls',
        description: 'Overly permissive role-based access control configurations',
        impact: 'Potential for privilege escalation and data exposure'
      }
    ],
    recommendations: [
      {
        id: 'sec-rec-1',
        title: 'Implement Enterprise MFA Solution',
        description: 'Deploy multi-factor authentication across all systems and user accounts',
        priority: 'high',
        estimatedCost: '$12,000 - $18,000',
        estimatedTime: '3-4 weeks',
        impact: 'Reduce account compromise risk by 99%'
      },
      {
        id: 'sec-rec-2',
        title: 'Establish Continuous Security Monitoring',
        description: 'Implement SIEM platform with automated threat detection and response',
        priority: 'high',
        estimatedCost: '$45,000 - $65,000',
        estimatedTime: '8-12 weeks',
        impact: 'Real-time threat detection with automated incident response'
      },
      {
        id: 'sec-rec-3',
        title: 'Conduct Comprehensive Penetration Testing',
        description: 'Engage third-party security firm for full-scope penetration test',
        priority: 'high',
        estimatedCost: '$20,000 - $30,000',
        estimatedTime: '4-6 weeks',
        impact: 'Identify and remediate critical vulnerabilities before exploitation'
      }
    ],
    quickWins: [
      {
        id: 'sec-qw-1',
        title: 'Patch Critical Vulnerabilities',
        description: 'Apply security patches for all critical CVEs',
        timeframe: '2-3 days',
        effort: 'medium'
      },
      {
        id: 'sec-qw-2',
        title: 'Enable MFA for Admin Accounts',
        description: 'Immediately enable MFA for all administrative access',
        timeframe: '1 day',
        effort: 'low'
      }
    ],
    estimatedInvestment: {
      immediate: '$5,000 - $8,000',
      shortTerm: '$40,000 - $60,000',
      longTerm: '$80,000 - $120,000'
    }
  },
  {
    id: 'seo',
    name: 'SEO & Digital Presence',
    icon: 'Globe',
    score: 3,
    status: 'moderate',
    executiveSummary: 'Digital presence demonstrates solid foundational SEO practices with opportunities for strategic enhancement. Technical SEO is adequate but content optimization and backlink profile require strategic investment.',
    strengths: [
      'Clean site architecture with logical URL structure',
      'Mobile-responsive design with fast page load times',
      'Regular content publication schedule',
      'Basic keyword targeting implementation',
      'Google Search Console and Analytics properly configured'
    ],
    weaknesses: [
      'Limited high-authority backlink acquisition',
      'Inconsistent metadata optimization across pages',
      'Lack of structured data implementation',
      'Insufficient local SEO optimization',
      'Limited content depth on key commercial pages'
    ],
    issues: [
      {
        id: 'seo-1',
        severity: 'medium',
        title: 'Weak Backlink Profile',
        description: 'Limited number of high-quality backlinks from authoritative domains',
        impact: 'Reduced domain authority and organic search visibility'
      },
      {
        id: 'seo-2',
        severity: 'medium',
        title: 'Missing Schema Markup',
        description: 'No structured data implementation for enhanced search results',
        impact: 'Lost opportunities for rich snippets and improved CTR'
      },
      {
        id: 'seo-3',
        severity: 'low',
        title: 'Inconsistent Internal Linking',
        description: 'Suboptimal internal linking structure for SEO value distribution',
        impact: 'Reduced crawl efficiency and PageRank distribution'
      }
    ],
    recommendations: [
      {
        id: 'seo-rec-1',
        title: 'Implement Comprehensive Schema Markup',
        description: 'Deploy structured data across all page types for enhanced SERP features',
        priority: 'high',
        estimatedCost: '$8,000 - $12,000',
        estimatedTime: '3-4 weeks',
        impact: 'Improve click-through rates by 20-30% via rich snippets'
      },
      {
        id: 'seo-rec-2',
        title: 'Execute Strategic Link Building Campaign',
        description: 'Develop high-quality backlink acquisition strategy with content partnerships',
        priority: 'medium',
        estimatedCost: '$15,000 - $25,000',
        estimatedTime: '3-6 months',
        impact: 'Increase domain authority and organic traffic by 40%'
      }
    ],
    quickWins: [
      {
        id: 'seo-qw-1',
        title: 'Optimize Page Titles and Meta Descriptions',
        description: 'Update all primary pages with optimized metadata',
        timeframe: '3-5 days',
        effort: 'low'
      },
      {
        id: 'seo-qw-2',
        title: 'Add Organization Schema',
        description: 'Implement basic organization schema markup',
        timeframe: '1-2 days',
        effort: 'low'
      }
    ],
    estimatedInvestment: {
      immediate: '$3,000 - $5,000',
      shortTerm: '$15,000 - $25,000',
      longTerm: '$30,000 - $50,000'
    }
  },
  {
    id: 'ux',
    name: 'UX & Conversion',
    icon: 'MousePointer',
    score: 4,
    status: 'good',
    executiveSummary: 'User experience demonstrates strong foundational design principles with clear conversion paths. Analytics indicate healthy engagement metrics with targeted opportunities for conversion rate optimization.',
    strengths: [
      'Intuitive navigation with clear information architecture',
      'Fast page load times (< 2 seconds)',
      'Mobile-first responsive design',
      'Clear call-to-action placement and hierarchy',
      'A/B testing framework in place',
      'Comprehensive analytics implementation'
    ],
    weaknesses: [
      'Limited personalization based on user behavior',
      'Checkout process has 3-step friction points',
      'Insufficient social proof and trust signals',
      'Limited progressive profiling in forms'
    ],
    issues: [
      {
        id: 'ux-1',
        severity: 'medium',
        title: 'Cart Abandonment Rate Above Industry Average',
        description: '68% cart abandonment rate vs. 60% industry benchmark',
        impact: 'Estimated $120K annual revenue loss'
      },
      {
        id: 'ux-2',
        severity: 'low',
        title: 'Form Completion Rates Below Optimal',
        description: 'Lead forms showing 45% completion rate vs. 60% target',
        impact: 'Missed lead generation opportunities'
      }
    ],
    recommendations: [
      {
        id: 'ux-rec-1',
        title: 'Optimize Checkout Flow',
        description: 'Streamline checkout process to single-page with guest checkout option',
        priority: 'high',
        estimatedCost: '$18,000 - $25,000',
        estimatedTime: '4-6 weeks',
        impact: 'Projected 15-20% reduction in cart abandonment'
      },
      {
        id: 'ux-rec-2',
        title: 'Implement Smart Form Optimization',
        description: 'Deploy progressive profiling and smart field validation',
        priority: 'medium',
        estimatedCost: '$10,000 - $15,000',
        estimatedTime: '3-4 weeks',
        impact: 'Increase form completion by 25%'
      }
    ],
    quickWins: [
      {
        id: 'ux-qw-1',
        title: 'Add Trust Badges to Checkout',
        description: 'Display security and payment badges prominently',
        timeframe: '1-2 days',
        effort: 'low'
      },
      {
        id: 'ux-qw-2',
        title: 'Implement Exit-Intent Popups',
        description: 'Deploy targeted exit-intent offers for cart abandonment',
        timeframe: '2-3 days',
        effort: 'low'
      }
    ],
    estimatedInvestment: {
      immediate: '$2,000 - $4,000',
      shortTerm: '$20,000 - $30,000',
      longTerm: '$40,000 - $60,000'
    }
  },
  {
    id: 'marketing',
    name: 'Marketing & Positioning',
    icon: 'Target',
    score: 4,
    status: 'good',
    executiveSummary: 'Marketing strategy demonstrates strong brand positioning with consistent messaging across channels. Campaign performance metrics exceed industry benchmarks with opportunities for enhanced attribution and automation.',
    strengths: [
      'Clear value proposition and brand messaging',
      'Multi-channel marketing strategy in execution',
      'Strong content marketing foundation',
      'Effective email marketing with healthy engagement rates',
      'Active social media presence with growing audience',
      'Marketing automation platform in use'
    ],
    weaknesses: [
      'Incomplete multi-touch attribution model',
      'Limited account-based marketing (ABM) capabilities',
      'Insufficient marketing-sales alignment on lead scoring',
      'Gaps in customer lifecycle marketing'
    ],
    issues: [
      {
        id: 'mkt-1',
        severity: 'medium',
        title: 'Attribution Gaps in Customer Journey',
        description: 'Unable to accurately track ROI across all marketing touchpoints',
        impact: 'Suboptimal budget allocation and missed optimization opportunities'
      },
      {
        id: 'mkt-2',
        severity: 'medium',
        title: 'Limited Marketing-Sales Handoff Process',
        description: 'Lack of standardized lead qualification and handoff procedures',
        impact: 'Lead leakage and sales team inefficiency'
      }
    ],
    recommendations: [
      {
        id: 'mkt-rec-1',
        title: 'Implement Multi-Touch Attribution Model',
        description: 'Deploy advanced attribution tracking across all marketing channels',
        priority: 'high',
        estimatedCost: '$20,000 - $30,000',
        estimatedTime: '6-8 weeks',
        impact: 'Improve marketing ROI by 25% through optimized budget allocation'
      },
      {
        id: 'mkt-rec-2',
        title: 'Deploy Account-Based Marketing Platform',
        description: 'Implement ABM strategy for enterprise customer acquisition',
        priority: 'medium',
        estimatedCost: '$25,000 - $40,000',
        estimatedTime: '8-10 weeks',
        impact: 'Increase enterprise deal closure rate by 30%'
      }
    ],
    quickWins: [
      {
        id: 'mkt-qw-1',
        title: 'Standardize UTM Tracking',
        description: 'Implement consistent UTM parameter strategy across all campaigns',
        timeframe: '2-3 days',
        effort: 'low'
      },
      {
        id: 'mkt-qw-2',
        title: 'Create Lead Scoring Model',
        description: 'Define basic lead scoring criteria for sales handoff',
        timeframe: '5-7 days',
        effort: 'medium'
      }
    ],
    estimatedInvestment: {
      immediate: '$3,000 - $6,000',
      shortTerm: '$25,000 - $40,000',
      longTerm: '$50,000 - $80,000'
    }
  },
  {
    id: 'automation',
    name: 'Automation & Processes',
    icon: 'Zap',
    score: 3,
    status: 'moderate',
    executiveSummary: 'Business process automation shows foundational implementation with significant opportunities for efficiency gains. Current automation covers approximately 40% of repetitive tasks, with clear path to 70%+ automation rate.',
    strengths: [
      'Core business workflows documented',
      'Basic CRM automation in place',
      'Email marketing automation functional',
      'Standard operating procedures defined',
      'Regular process review cadence established'
    ],
    weaknesses: [
      'Heavy reliance on manual data entry and transfers',
      'Limited cross-system integration and workflow automation',
      'Insufficient use of RPA for repetitive tasks',
      'No centralized process orchestration platform',
      'Manual reporting and data aggregation processes'
    ],
    issues: [
      {
        id: 'auto-1',
        severity: 'high',
        title: 'Manual Data Transfer Between Systems',
        description: 'Daily manual export/import processes between CRM, accounting, and inventory systems',
        impact: 'Estimated 15 hours/week staff time and high error rate (8%)'
      },
      {
        id: 'auto-2',
        severity: 'medium',
        title: 'Lack of Automated Reporting',
        description: 'Executive reports generated manually from multiple data sources',
        impact: '20+ hours monthly spent on report generation'
      },
      {
        id: 'auto-3',
        severity: 'medium',
        title: 'Inconsistent Approval Workflows',
        description: 'No standardized digital approval processes for routine business decisions',
        impact: 'Delayed decision-making and lost productivity'
      }
    ],
    recommendations: [
      {
        id: 'auto-rec-1',
        title: 'Implement iPaaS Solution',
        description: 'Deploy integration platform (Zapier/Make/Workato) to connect core business systems',
        priority: 'high',
        estimatedCost: '$15,000 - $25,000',
        estimatedTime: '6-8 weeks',
        impact: 'Eliminate 80% of manual data transfers, save 12 hours/week'
      },
      {
        id: 'auto-rec-2',
        title: 'Deploy RPA for Repetitive Tasks',
        description: 'Implement robotic process automation for high-volume repetitive workflows',
        priority: 'medium',
        estimatedCost: '$20,000 - $35,000',
        estimatedTime: '8-10 weeks',
        impact: 'Automate 25+ hours of weekly manual tasks'
      },
      {
        id: 'auto-rec-3',
        title: 'Create Automated Reporting Dashboard',
        description: 'Build real-time executive dashboard with automated data aggregation',
        priority: 'high',
        estimatedCost: '$12,000 - $18,000',
        estimatedTime: '4-6 weeks',
        impact: 'Reduce reporting time by 90%, enable real-time insights'
      }
    ],
    quickWins: [
      {
        id: 'auto-qw-1',
        title: 'Automate Daily Data Sync',
        description: 'Set up basic integration between CRM and email platform',
        timeframe: '3-5 days',
        effort: 'medium'
      },
      {
        id: 'auto-qw-2',
        title: 'Create Email Report Templates',
        description: 'Build automated email reports for key metrics',
        timeframe: '2-3 days',
        effort: 'low'
      }
    ],
    estimatedInvestment: {
      immediate: '$4,000 - $7,000',
      shortTerm: '$25,000 - $40,000',
      longTerm: '$50,000 - $75,000'
    }
  },
  {
    id: 'strategy',
    name: 'Strategy & Roadmap',
    icon: 'Map',
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
      'Strong stakeholder communication cadence'
    ],
    weaknesses: [
      'Limited scenario planning for market disruptions',
      'Opportunity to enhance competitive intelligence integration',
      'Could benefit from more dynamic strategy adjustment mechanisms'
    ],
    issues: [
      {
        id: 'strat-1',
        severity: 'low',
        title: 'Infrequent Strategy Refresh Cycle',
        description: 'Annual strategic planning cycle may be too slow for dynamic market',
        impact: 'Potential delayed response to market shifts'
      }
    ],
    recommendations: [
      {
        id: 'strat-rec-1',
        title: 'Implement Rolling Strategic Planning',
        description: 'Move from annual to quarterly rolling strategic planning cycles',
        priority: 'medium',
        estimatedCost: '$8,000 - $12,000',
        estimatedTime: '4-6 weeks',
        impact: 'Enable more agile strategic response to market changes'
      },
      {
        id: 'strat-rec-2',
        title: 'Develop Scenario Planning Framework',
        description: 'Create systematic approach to strategic scenario analysis',
        priority: 'low',
        estimatedCost: '$10,000 - $15,000',
        estimatedTime: '6-8 weeks',
        impact: 'Improved strategic resilience and risk mitigation'
      }
    ],
    quickWins: [
      {
        id: 'strat-qw-1',
        title: 'Create Strategy Dashboard',
        description: 'Build real-time dashboard for strategic KPI tracking',
        timeframe: '5-7 days',
        effort: 'medium'
      }
    ],
    estimatedInvestment: {
      immediate: '$2,000 - $3,000',
      shortTerm: '$10,000 - $15,000',
      longTerm: '$20,000 - $30,000'
    }
  }
];

export const strategyRoadmap: StrategyInitiative[] = [
  // Quick Wins (≤1 week)
  {
    id: 'qw-1',
    title: 'Enable MFA for Admin Accounts',
    description: 'Immediately secure all administrative access with multi-factor authentication',
    timeframe: 'quick-win',
    impact: 'high',
    effort: 'low'
  },
  {
    id: 'qw-2',
    title: 'Patch Critical Security Vulnerabilities',
    description: 'Apply all critical CVE patches to production systems',
    timeframe: 'quick-win',
    impact: 'high',
    effort: 'medium'
  },
  {
    id: 'qw-3',
    title: 'Optimize Page Metadata',
    description: 'Update titles and meta descriptions for improved SEO',
    timeframe: 'quick-win',
    impact: 'medium',
    effort: 'low'
  },
  {
    id: 'qw-4',
    title: 'Add Trust Badges to Checkout',
    description: 'Display security badges to reduce cart abandonment',
    timeframe: 'quick-win',
    impact: 'medium',
    effort: 'low'
  },
  {
    id: 'qw-5',
    title: 'Standardize UTM Tracking',
    description: 'Implement consistent campaign tracking parameters',
    timeframe: 'quick-win',
    impact: 'medium',
    effort: 'low'
  },
  
  // Medium Term (≈1 month)
  {
    id: 'mt-1',
    title: 'Implement Infrastructure as Code',
    description: 'Deploy Terraform for declarative infrastructure management',
    timeframe: 'medium-term',
    impact: 'high',
    effort: 'medium',
    dependencies: ['qw-2']
  },
  {
    id: 'mt-2',
    title: 'Deploy Schema Markup',
    description: 'Implement structured data across all page types',
    timeframe: 'medium-term',
    impact: 'high',
    effort: 'low'
  },
  {
    id: 'mt-3',
    title: 'Optimize Checkout Flow',
    description: 'Streamline to single-page checkout with guest option',
    timeframe: 'medium-term',
    impact: 'high',
    effort: 'medium'
  },
  {
    id: 'mt-4',
    title: 'Implement iPaaS Integration',
    description: 'Connect core business systems to eliminate manual data transfers',
    timeframe: 'medium-term',
    impact: 'high',
    effort: 'medium'
  },
  {
    id: 'mt-5',
    title: 'Deploy Multi-Touch Attribution',
    description: 'Track marketing ROI across all touchpoints',
    timeframe: 'medium-term',
    impact: 'high',
    effort: 'medium'
  },
  
  // Strategic Initiatives (1-3 months)
  {
    id: 'si-1',
    title: 'Migrate to Microservices Architecture',
    description: 'Decompose monolith into scalable containerized services',
    timeframe: 'strategic',
    impact: 'high',
    effort: 'high',
    dependencies: ['mt-1']
  },
  {
    id: 'si-2',
    title: 'Implement SIEM Platform',
    description: 'Deploy comprehensive security monitoring and incident response',
    timeframe: 'strategic',
    impact: 'high',
    effort: 'high',
    dependencies: ['qw-1', 'qw-2']
  },
  {
    id: 'si-3',
    title: 'Upgrade Database Infrastructure',
    description: 'Implement clustering and read replicas for scalability',
    timeframe: 'strategic',
    impact: 'high',
    effort: 'high',
    dependencies: ['mt-1']
  },
  {
    id: 'si-4',
    title: 'Execute Link Building Campaign',
    description: 'Strategic backlink acquisition through content partnerships',
    timeframe: 'strategic',
    impact: 'medium',
    effort: 'medium'
  },
  {
    id: 'si-5',
    title: 'Deploy RPA for Process Automation',
    description: 'Automate 25+ hours of weekly repetitive tasks',
    timeframe: 'strategic',
    impact: 'medium',
    effort: 'medium',
    dependencies: ['mt-4']
  },
  {
    id: 'si-6',
    title: 'Implement ABM Platform',
    description: 'Deploy account-based marketing for enterprise acquisition',
    timeframe: 'strategic',
    impact: 'medium',
    effort: 'medium',
    dependencies: ['mt-5']
  }
];
