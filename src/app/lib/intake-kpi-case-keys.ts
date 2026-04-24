import {
  evaluateCriticalSignalsPilot,
  matchCasePatterns,
  type IntakeCasePatternCatalogV1,
} from '@glc/intake-core';
import caseCatalog from '@glc/intake-core/intake-case-patterns.v1.json';

const catalog = caseCatalog as IntakeCasePatternCatalogV1;

/**
 * Resolves current adaptive case pattern keys for public intake telemetry (client-side, same heuristics as server plan).
 */
export function computeKpiCaseKeys(
  responses: Record<string, unknown>,
  /** Bank ids on the current surface (SLA / visible for plan eligibility). */
  visibleBankIds: string[],
): string[] {
  if (visibleBankIds.length === 0) return [];
  const critical = evaluateCriticalSignalsPilot({
    responses,
    plan: { eligible: visibleBankIds },
  });
  return matchCasePatterns({
    responses,
    confidenceByKey: critical.confidenceByKey,
    catalog,
  }).map(m => m.caseKey);
}
