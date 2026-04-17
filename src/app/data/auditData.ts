/**
 * Legacy compatibility facade.
 * Prefer importing from `src/app/data/audit` in new code.
 */
export type {
  AuditDomain,
  AuditIssue,
  QuickWin,
  Recommendation,
  StrategyInitiative,
} from './audit/contracts/report-types';

export { auditDomains } from './audit/catalog/report-catalog.fallback';
export { strategyRoadmap } from './audit/catalog/strategy-roadmap.fallback';
