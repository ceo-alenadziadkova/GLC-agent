import { describe, expect, it } from 'vitest';
import type { IntakePlan } from '@glc/intake-core';
import {
  collectPlanIds,
  formatPublicationLogTimestamp,
  parseWordingImportJson,
} from './model';

function makePlan(): IntakePlan {
  return {
    eligible: ['a2', 'a1'],
    visible: ['a1'],
    required: ['a3'],
    hidden: [],
    deferred: ['a2'],
    reasonsById: {},
    slaVisibleBankIds: [],
    versions: { bankVersion: 'v1', policyVersion: 'v1', layoutVersion: 'v1', resolverVersion: 'v1' },
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
    confidence: { score: 1, level: 'high', reasons: [] },
    missingForReport: [],
    nextRecommended: [],
  } as unknown as IntakePlan;
}

describe('intake-wording-workspace/model', () => {
  it('parses only string map entries on import', () => {
    const result = parseWordingImportJson('{"a1":"Hello","a2":10}', 'bad json', 'bad map');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.drafts).toEqual({ a1: 'Hello' });
    }
  });

  it('returns sorted unique plan ids', () => {
    const ids = collectPlanIds({
      ok: true,
      plan: makePlan(),
    });
    expect(ids).toEqual(['a1', 'a2', 'a3']);
  });

  it('formats publication timestamps in UTC shape', () => {
    expect(formatPublicationLogTimestamp('2026-01-02T03:04:05.000Z')).toBe('2026-01-02 03:04:05 UTC');
  });
});
