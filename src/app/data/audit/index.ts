export type {
  AuditDomain,
  AuditIssue,
  QuickWin,
  Recommendation,
  StrategyInitiative,
} from './contracts/report-types';

export { auditDomains } from './catalog/report-catalog.fallback';
export { strategyRoadmap } from './catalog/strategy-roadmap.fallback';

export {
  mapDomainDataToAuditDomain,
  mapDomainsRecordToAuditDomains,
  mapStrategyRoadmapToInitiatives,
} from './mappers/domain-view.mapper';

export { selectAverageScore, selectCriticalIssueCount, selectQuickWins } from './selectors/report-selectors';
