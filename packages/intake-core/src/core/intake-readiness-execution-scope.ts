/**
 * Execution-plan slice helpers for {@link evaluateIntakeReadinessEnvelope} (ADR Phase-B/C).
 * When enabled via `applyExecutionPlanCoverageScope`, in-scope coverage gaps come from
 * `missingForReport` domains intersected with the audit execution plan (selected domains + strategy flag).
 */
import type { DomainKey } from '../audit-contract.js';
import { QUESTION_FEED_ROLES } from '../question-feed-roles.js';
import { isIntakeAnswered } from '../unwrap.js';

import type { IntakePlanCoverageDomain } from './types.js';

export function filterMissingDomainsForExecutionPlan(args: {
  missingForReport: readonly IntakePlanCoverageDomain[];
  executionSelectedDomains: readonly DomainKey[];
  executionIncludeStrategy: boolean;
}): IntakePlanCoverageDomain[] {
  const selected = new Set(args.executionSelectedDomains);
  return args.missingForReport.filter(domain => {
    if (domain === 'recon') return true;
    if (domain === 'strategy') return args.executionIncludeStrategy;
    return selected.has(domain as DomainKey);
  });
}

export function unansweredPrimaryBankIdsForCoverageDomains(args: {
  domains: readonly IntakePlanCoverageDomain[];
  slaVisibleBankIds: readonly string[];
  responses: Record<string, unknown>;
}): string[] {
  if (args.domains.length === 0) return [];
  const domainSet = new Set(args.domains);
  const out: string[] = [];
  for (const id of args.slaVisibleBankIds) {
    if (isIntakeAnswered(args.responses[id])) continue;
    const primary = QUESTION_FEED_ROLES[id]?.primary ?? [];
    if (!primary.some(p => domainSet.has(p))) continue;
    out.push(id);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}
