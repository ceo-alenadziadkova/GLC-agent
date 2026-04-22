import { describe, expect, it } from 'vitest';

import { ApiError } from '../../data/api-error';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { formatOrchestrationPackRunErrorMessage } from '../orchestration-pack-api-error';

describe('formatOrchestrationPackRunErrorMessage', () => {
  it('uses not_ready_reason_code for 409 not ready', () => {
    const e = new ApiError('x', 409, 'X', { not_ready_reason_code: 'manifest_snapshot_not_latest' });
    const out = formatOrchestrationPackRunErrorMessage(e, ORCHESTRATION_UI_COPY.packBuildFailed);
    expect(out.message).toBe(ORCHESTRATION_UI_COPY.packBuildFailed);
    expect(out.description).toContain('manifest_snapshot_not_latest');
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
