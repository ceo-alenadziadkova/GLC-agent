import { describe, expect, it } from 'vitest';

import { selectRemediationPilotQueue } from '../core/evaluate-remediation-pilot.js';
import type { IntakePlan } from '../core/types.js';

describe('selectRemediationPilotQueue', () => {
  it('only enqueues bank ids that are eligible (precedence vs allow-list)', () => {
    const plan = {
      eligible: [],
      versions: {
        sequencingVersion: '1.0.0',
        questionBankVersion: '1',
        policyVersion: '1',
        layoutVersion: '1',
        resolverVersion: '1',
      },
    } as unknown as IntakePlan;
    const r = selectRemediationPilotQueue({
      plan,
      responses: { a2: 'Healthcare' },
    });
    expect(r.queue).toEqual([]);
    expect(r.trace.some(t => t.code === 'remediation_candidate_ineligible')).toBe(true);
  });

  it('is idempotent for identical plan and responses', () => {
    const plan = {
      eligible: ['a1', 'a3', 'a2', 'a5'],
      versions: {
        sequencingVersion: '1.0.0',
        questionBankVersion: '1',
        policyVersion: '1',
        layoutVersion: '1',
        resolverVersion: '1',
      },
    } as unknown as IntakePlan;
    const responses = { a2: 'Healthcare', a5: 'multi_page_website' };
    const a = selectRemediationPilotQueue({ plan, responses });
    const b = selectRemediationPilotQueue({ plan, responses });
    expect(a.queue).toEqual(['a1', 'a3']);
    expect(a.queue).toEqual(b.queue);
  });
});
