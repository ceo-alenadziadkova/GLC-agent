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

  it('treats unknown-marked cells as already acknowledged in same pass', () => {
    const plan = {
      eligible: ['a1', 'a3', 'a2'],
      versions: {
        sequencingVersion: '1.0.0',
        questionBankVersion: '1',
        policyVersion: '1',
        layoutVersion: '1',
        resolverVersion: '1',
      },
    } as unknown as IntakePlan;
    const responses = {
      a2: 'Healthcare',
      a1: { value: null, source: 'unknown' as const },
    };
    const r = selectRemediationPilotQueue({
      plan,
      responses,
      collectionMode: 'self_serve',
      surface: 'client_form',
    });
    expect(r.queue).toEqual(['a3']);
    expect(r.trace.some(t => t.code === 'remediation_candidate_skipped_unknown_already_acknowledged')).toBe(true);
  });

  it('respects zero remediation budget on pre-brief surface policy', () => {
    const plan = {
      eligible: ['a1', 'a3', 'a2'],
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
      collectionMode: 'pre_brief',
      surface: 'client_form',
    });
    expect(r.queue).toEqual([]);
    expect(r.trace.some(t => t.code === 'remediation_budget_zero_for_surface')).toBe(true);
  });
});
