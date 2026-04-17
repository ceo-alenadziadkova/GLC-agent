export interface CatalogAuditIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
}

export interface CatalogRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedCost: string;
  estimatedTime: string;
  impact: string;
}

export interface CatalogQuickWin {
  id: string;
  title: string;
  description: string;
  timeframe: string;
  effort: 'low' | 'medium' | 'high';
}

export interface CatalogStrategyInitiative {
  id: string;
  title: string;
  description: string;
  timeframe: 'quick-win' | 'medium-term' | 'strategic';
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  dependencies?: string[];
}

export interface CatalogAuditDomain {
  id: string;
  name: string;
  icon: string;
  score: number;
  status: 'excellent' | 'good' | 'moderate' | 'needs-improvement' | 'critical';
  executiveSummary: string;
  strengths: string[];
  weaknesses: string[];
  issues: CatalogAuditIssue[];
  recommendations: CatalogRecommendation[];
  quickWins: CatalogQuickWin[];
  estimatedInvestment: {
    immediate: string;
    shortTerm: string;
    longTerm: string;
  };
}
