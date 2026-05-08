import type { OrchestrationPlanGovernanceDto } from '../data/api/orchestration-types';

const GOVERNANCE_STATUS = new Set<string>(['pass', 'pass_with_warnings', 'fail']);
const GOVERNANCE_DECISION = new Set<string>(['persist', 'reject']);

/**
 * Type-narrow API error payloads that may attach `plan_governance` without assuming full shape blindly.
 */
export function coerceOrchestrationPlanGovernance(details: unknown): OrchestrationPlanGovernanceDto | null {
  if (details === null || typeof details !== 'object') return null;
  const root = details as Record<string, unknown>;
  const pg = root.plan_governance;
  if (pg === null || typeof pg !== 'object') return null;
  const row = pg as Record<string, unknown>;
  /** Minimal contract: status + decision match the DTO enum — reject unexpected strings from proxies or partial errors. */
  if (typeof row.status !== 'string' || typeof row.decision !== 'string') return null;
  if (!GOVERNANCE_STATUS.has(row.status) || !GOVERNANCE_DECISION.has(row.decision)) return null;
  return pg as OrchestrationPlanGovernanceDto;
}
