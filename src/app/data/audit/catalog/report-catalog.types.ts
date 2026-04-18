import type { AuditDomainId } from './domain-keys';
import {
  CATALOG_DOMAIN_STATUSES,
  CATALOG_EFFORT_LEVELS,
  CATALOG_ISSUE_SEVERITIES,
  CATALOG_RECOMMENDATION_PRIORITIES,
} from './config/catalog-copy.constants';

export type CatalogIssueSeverity = (typeof CATALOG_ISSUE_SEVERITIES)[number];
export type CatalogRecommendationPriority = (typeof CATALOG_RECOMMENDATION_PRIORITIES)[number];
export type CatalogEffortLevel = (typeof CATALOG_EFFORT_LEVELS)[number];
export type CatalogDomainStatus = (typeof CATALOG_DOMAIN_STATUSES)[number];

export interface CatalogAuditIssue {
  id: string;
  severity: CatalogIssueSeverity;
  title: string;
  description: string;
  impact: string;
}

export interface CatalogRecommendation {
  id: string;
  title: string;
  description: string;
  priority: CatalogRecommendationPriority;
  estimatedCost: string;
  estimatedTime: string;
  impact: string;
}

export interface CatalogQuickWin {
  id: string;
  title: string;
  description: string;
  timeframe: string;
  effort: CatalogEffortLevel;
}

export interface CatalogStrategyInitiative {
  id: string;
  title: string;
  description: string;
  timeframe: 'quick-win' | 'medium-term' | 'strategic';
  impact: CatalogRecommendationPriority;
  effort: CatalogEffortLevel;
  dependencies?: string[];
}

export interface CatalogAuditDomain {
  id: AuditDomainId;
  name: string;
  icon: string;
  score: number;
  status: CatalogDomainStatus;
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
