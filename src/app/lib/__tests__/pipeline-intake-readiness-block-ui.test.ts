import { describe, expect, it } from 'vitest';
import { intakeReadinessMissingBankIdsFromEnvelopeDetails } from '../pipeline-intake-readiness-block-ui';

describe('intakeReadinessMissingBankIdsFromEnvelopeDetails', () => {
  it('collects missingRequiredIds from audit and flow gap trace rows', () => {
    const ids = intakeReadinessMissingBankIdsFromEnvelopeDetails({
      readiness: {
        trace: [
          { code: 'flow_blocked_express_required', detail: { missingRequiredIds: ['x1', 'x2'] } },
          { code: 'audit_blocked_full_sla', detail: { missingRequiredIds: ['x2', 'full1'] } },
        ],
      },
    });
    expect(ids).toEqual(['x1', 'x2', 'full1']);
  });

  it('returns empty array when malformed', () => {
    expect(intakeReadinessMissingBankIdsFromEnvelopeDetails(null)).toEqual([]);
    expect(intakeReadinessMissingBankIdsFromEnvelopeDetails({})).toEqual([]);
  });
});
