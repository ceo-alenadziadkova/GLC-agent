import { describe, expect, it } from 'vitest';

import { buildHypothesisCrossCheckFromReconPrefills } from '../core/intake-readiness-envelope.js';
import { buildIntakePlan } from '../core/build-intake-plan.js';
import { decideIntakeNextQuestion, evaluateMinimumSufficientContext } from '../core/intake-next-question.js';
import { loadIntakePolicy } from '../core/load-policy.js';
import { currentIntakeVersionTuple } from '../core/versions.js';

describe('intake next-question (deterministic)', () => {
  it('returns ask when nextRecommended is non-empty', () => {
    const plan = buildIntakePlan({
      responses: { a2: 'E-commerce', a7: 'Scaling' },
      productMode: 'full',
      collectionMode: 'discovery',
      surface: 'public_discovery',
      intakeVersionTuple: currentIntakeVersionTuple(),
    });
    const policy = loadIntakePolicy();
    const d = decideIntakeNextQuestion({ plan, policy: policy.intelligence?.minimumSufficientContext });
    expect(d.action).toBe('ask');
    expect(d.questionId).toBeTruthy();
  });

  it('evaluates minimum sufficient when policy enabled with loose gates', () => {
    const policy = loadIntakePolicy();
    const m = evaluateMinimumSufficientContext({
      plan: { nextRecommended: [] } as unknown as import('../core/types.js').IntakePlan,
      policy: policy.intelligence?.minimumSufficientContext,
    });
    expect(m.sufficient).toBe(true);
  });
});

describe('buildHypothesisCrossCheckFromReconPrefills (G9)', () => {
  it('maps pilot bank prefills to recon_confirmed', () => {
    const c = buildHypothesisCrossCheckFromReconPrefills({ a2: 'Retail', f1: 'Leads' });
    expect(c.a2).toEqual({ value: 'Retail', source: 'recon_confirmed' });
    expect(c.f1).toEqual({ value: 'Leads', source: 'recon_confirmed' });
  });
});
