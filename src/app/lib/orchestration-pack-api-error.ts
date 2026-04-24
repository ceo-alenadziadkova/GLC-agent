import { ApiError } from '../data/api-error';
import type { OrchestrationPlanGovernanceDto } from '../data/api/audits-orchestration';
import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';
import {
  ORCHESTRATION_PLAN_GOVERNANCE_REASON_HINTS,
  type OrchestrationPlanGovernanceReasonCode,
} from '../config/orchestration-plan-governance';

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
    plan_governance?: OrchestrationPlanGovernanceDto;
  };

  if (d.not_ready_reason_code) {
    return {
      message: genericFailureLabel,
      description: `Not ready: ${d.not_ready_reason_code}`,
    };
  }

  if (d.plan_governance) {
    const { blocking_reasons, reason_codes, decision } = d.plan_governance;
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
