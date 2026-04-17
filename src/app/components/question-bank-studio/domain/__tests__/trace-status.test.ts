import { describe, expect, it } from 'vitest';
import type { IntakePlan } from '@glc/intake-core';

import { buildTraceStatusMap, getTraceStatusForId } from '../trace-status';

function makePlan(): IntakePlan {
  return {
    eligible: ['q1'],
    visible: ['q1'],
    required: ['q1'],
    hidden: ['q1'],
    deferred: ['q1'],
    slaVisibleBankIds: ['q1'],
    versions: { bankVersion: 'v1', policyVersion: 'v1', resolverVersion: 'v1' },
    derivedFacts: {
      answeredById: {},
      unansweredRequiredCount: 0,
      unansweredRecommendedCount: 0,
      answeredRequiredCount: 0,
      answeredRecommendedCount: 0,
    },
    coverage: {
      requiredAnswered: 0,
      requiredTotal: 0,
      recommendedAnswered: 0,
      recommendedTotal: 0,
      domainCoverage: {},
    },
    confidence: {
      score: 1,
      level: 'high',
      reasons: [],
    },
    missingForReport: [],
    nextRecommended: [],
    reasonsById: {},
  } as unknown as IntakePlan;
}

describe('trace-status', () => {
  it('applies precedence where required overrides other statuses', () => {
    const map = buildTraceStatusMap(makePlan());

    expect(getTraceStatusForId(map, 'q1')).toBe('required');
  });

  it('returns unknown for missing ids', () => {
    const map = buildTraceStatusMap(null);
    expect(getTraceStatusForId(map, 'missing')).toBe('unknown');
  });
});
