import type {
  CatalogAuditDomain,
  CatalogAuditIssue,
  CatalogQuickWin,
  CatalogRecommendation,
  CatalogStrategyInitiative,
} from '../catalog/report-catalog.types';
import type {
  AuditIssue as BackendAuditIssue,
  DomainData,
  QuickWin as BackendQuickWin,
  Recommendation as BackendRecommendation,
  StrategyInitiative as BackendStrategyInitiative,
} from '../../auditTypes';

export type AuditIssue = CatalogAuditIssue;
export type Recommendation = CatalogRecommendation;
export type QuickWin = CatalogQuickWin;
export type StrategyInitiative = CatalogStrategyInitiative;
export type AuditDomain = CatalogAuditDomain;

export type BackendDomainData = DomainData;
export type BackendAuditIssueData = BackendAuditIssue;
export type BackendRecommendationData = BackendRecommendation;
export type BackendQuickWinData = BackendQuickWin;
export type BackendStrategyInitiativeData = BackendStrategyInitiative;
