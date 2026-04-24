import { describe, expect, it } from 'vitest';

import { buildIntakePlan } from '../core/build-intake-plan.js';
import { pruneNextRecommendedForSatisfiedCaseStops } from '../core/case-overlay-resolver.js';
import { pruneNextRecommendedAfterFollowupStops } from '../core/followup-policy-executor.js';
import type { IntakeCasePatternV1 } from '../core/case-pattern-types.js';

describe('adaptive intake prune helpers', () => {
  it('pruneNextRecommendedForSatisfiedCaseStops removes optional unanswered overlay ids after stop + minOverlay', () => {
    const c: IntakeCasePatternV1 = {
      caseKey: 'test_case',
      title: 'Test',
      preconditions: [],
      overlayQuestionIds: ['x1', 'x2', 'x3'],
      minOverlayAnswered: 1,
      stopCondition: { signalKeysWithConfidenceAtLeast: { min: 'low', keys: ['k1'] } },
      ownerDomain: 'strategy',
      reviewByIsoDate: '2099-01-01',
    };
    const { nextRecommended, prunedIds } = pruneNextRecommendedForSatisfiedCaseStops({
      nextRecommended: ['x1', 'x2', 'a10', 'x3'],
      matches: [c],
      stopConditionMetByCase: { test_case: true },
      responses: { x1: 'answered' },
      requiredBankIds: new Set(['a10']),
      enabled: true,
    });
    expect(prunedIds.sort()).toEqual(['x2', 'x3']);
    expect(nextRecommended).toEqual(['x1', 'a10']);
  });

  it('pruneNextRecommendedAfterFollowupStops removes trailing same-signal optionals after stop', () => {
    const { nextRecommended, prunedIds } = pruneNextRecommendedAfterFollowupStops({
      nextRecommended: ['b1', 'b3'],
      responses: { b1: 'We need better lead quality and conversion.' },
      requiredBankIds: new Set(),
      confidenceByKey: { primary_problem: 'medium' },
      ruleDefinitions: {
        pilot_default: {
          stopWhenSignalConfidenceIn: ['medium', 'high'],
          deeperWhenSignalConfidenceIn: ['unknown', 'low'],
        },
      },
      enabled: true,
    });
    expect(prunedIds).toContain('b3');
    expect(nextRecommended).toEqual(['b1']);
  });
});

describe('buildIntakePlan casePatternMatch differs by starter answers', () => {
  it('ecommerce scaling vs healthcare select different case keys (discovery)', () => {
    const eco = buildIntakePlan({
      responses: { a2: 'E-commerce', a7: 'Scaling' },
      productMode: 'full',
      collectionMode: 'discovery',
      surface: 'public_discovery',
    });
    const health = buildIntakePlan({
      responses: { a2: 'Healthcare', a7: 'Scaling' },
      productMode: 'full',
      collectionMode: 'discovery',
      surface: 'public_discovery',
    });
    expect(eco.casePatternMatch?.caseKeys).toContain('scaling_ecommerce_ops_bottleneck');
    expect(health.casePatternMatch?.caseKeys).toContain('healthcare_compliance_driven');
    expect(eco.casePatternMatch?.caseKeys).not.toEqual(health.casePatternMatch?.caseKeys);
  });
});
