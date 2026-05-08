import { describe, expect, it } from 'vitest';

import { ApiError } from '../../data/api-error';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { extractPlanGovernanceFromPackApiError, formatOrchestrationPackRunErrorMessage } from '../orchestration-pack-api-error';

describe('formatOrchestrationPackRunErrorMessage', () => {
  it('uses not_ready_reason_code for 409 not ready', () => {
    const e = new ApiError('x', 409, 'X', { not_ready_reason_code: 'manifest_snapshot_not_latest' });
    const out = formatOrchestrationPackRunErrorMessage(e, ORCHESTRATION_UI_COPY.packBuildFailed);
    expect(out.message).toBe(ORCHESTRATION_UI_COPY.packBuildFailed);
    expect(out.description).toContain('manifest_snapshot_not_latest');
  });

  it('falls back to generic message when plan_governance is malformed', () => {
    const e = new ApiError('x', 409, 'X', {
      plan_governance: { unresolved_conflicts: 1 },
    });
    const out = formatOrchestrationPackRunErrorMessage(e, ORCHESTRATION_UI_COPY.packBuildFailed);
    expect(out.message).toBe(ORCHESTRATION_UI_COPY.packBuildFailed);
    expect(out.description).toContain('x');
  });

  it('extractPlanGovernanceFromPackApiError returns null for non-ApiError', () => {
    expect(extractPlanGovernanceFromPackApiError(new Error('x'))).toBeNull();
  });

  it('extractPlanGovernanceFromPackApiError narrows malformed governance payloads', () => {
    const e = new ApiError('x', 409, 'X', { plan_governance: { unresolved_conflicts: 1 } });
    expect(extractPlanGovernanceFromPackApiError(e)).toBeNull();
  });

  it('extractPlanGovernanceFromPackApiError ignores non-object plan_governance', () => {
    const e = new ApiError('x', 409, 'X', { plan_governance: 'oops' });
    expect(extractPlanGovernanceFromPackApiError(e)).toBeNull();
  });

  it('extractPlanGovernanceFromPackApiError returns null when status or decision are not canonical enum values', () => {
    const e = new ApiError('x', 409, 'X', {
      plan_governance: { status: 'pending_review', decision: 'reject', unresolved_conflicts: 0 },
    });
    expect(extractPlanGovernanceFromPackApiError(e)).toBeNull();
  });

  it('extractPlanGovernanceFromPackApiError returns payload when plan_governance validates', () => {
    const pg = {
      blocking_reasons: ['director_input_coverage_below_floor'],
      reason_codes: ['director_input_coverage_below_floor'],
      decision: 'reject' as const,
      status: 'fail' as const,
      warnings: [] as string[],
      warnings_soft: [] as string[],
    };
    const e = new ApiError('refine', 409, 'X', { plan_governance: pg });
    expect(extractPlanGovernanceFromPackApiError(e)).toEqual(pg);
  });

  it('uses blocking_reasons and hints for governance 409', () => {
    const e = new ApiError('refine', 409, 'AUDITS_ORCHESTRATION_PLAN_REQUIRES_REFINEMENT', {
      plan_governance: {
        blocking_reasons: ['director_input_coverage_below_floor', 'confidence_coverage_below_floor'],
        reason_codes: ['director_input_coverage_below_floor', 'confidence_coverage_below_floor'],
        decision: 'reject',
        status: 'fail',
        warnings: [],
        warnings_soft: [],
      },
    });
    const out = formatOrchestrationPackRunErrorMessage(e, ORCHESTRATION_UI_COPY.packBuildFailed);
    expect(out.message).toBe(ORCHESTRATION_UI_COPY.packBuildGovernanceBlockedTitle);
    expect(out.description).toContain('director_input_coverage_below_floor');
    expect(out.description).toContain('Increase director');
  });
});
