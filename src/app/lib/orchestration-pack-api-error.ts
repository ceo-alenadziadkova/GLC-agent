import type { OrchestrationPlanGovernanceDto } from '../data/api/orchestration-types';
import { ApiError } from '../data/api-error';
import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';
import { coerceOrchestrationPlanGovernance } from './orchestration-plan-governance-guard';
import {
  ORCHESTRATION_PLAN_GOVERNANCE_REASON_HINTS,
  type OrchestrationPlanGovernanceReasonCode,
} from '../config/orchestration-plan-governance';

/** Narrow `plan_governance` from an {@link ApiError} without reading `details` blindly in UI handlers. */
export function extractPlanGovernanceFromPackApiError(error: unknown): OrchestrationPlanGovernanceDto | null {
  if (!(error instanceof ApiError)) return null;
  return coerceOrchestrationPlanGovernance(error.details);
}

function linesForReasonCodes(codes: readonly string[]): string {
  return codes
    .map(code => {
      const hint = ORCHESTRATION_PLAN_GOVERNANCE_REASON_HINTS[code as OrchestrationPlanGovernanceReasonCode];
      return hint ? `• ${code} — ${hint}` : `• ${code}`;
    })
    .join('\n');
}

/**
 * Builds user-visible copy for failed POST orchestration pack / orchestrator run
 * (409 plan refinement, 409 not ready, or generic error).
 */
export function formatOrchestrationPackRunErrorMessage(
  e: unknown,
  genericFailureLabel: string,
): { message: string; description?: string } {
  if (!(e instanceof ApiError)) {
    return { message: genericFailureLabel };
  }

  const details = e.details;
  if (!details || typeof details !== 'object' || details === null) {
    return { message: genericFailureLabel, description: e.message !== genericFailureLabel ? e.message : undefined };
  }

  const d = details as {
    not_ready_reason_code?: string;
  };

  if (typeof d.not_ready_reason_code === 'string' && d.not_ready_reason_code.length > 0) {
    return {
      message: genericFailureLabel,
      description: `Not ready: ${d.not_ready_reason_code}`,
    };
  }

  const pg = coerceOrchestrationPlanGovernance(details);
  if (pg) {
    const { blocking_reasons, reason_codes, decision } = pg;
    if (Array.isArray(blocking_reasons) && blocking_reasons.length > 0) {
      return {
        message: ORCHESTRATION_UI_COPY.packBuildGovernanceBlockedTitle,
        description: linesForReasonCodes(blocking_reasons),
      };
    }
    if (decision === 'reject' && Array.isArray(reason_codes) && reason_codes.length > 0) {
      return {
        message: ORCHESTRATION_UI_COPY.packBuildGovernanceBlockedTitle,
        description: linesForReasonCodes(reason_codes),
      };
    }
  }

  return { message: genericFailureLabel, description: e.message || undefined };
}
