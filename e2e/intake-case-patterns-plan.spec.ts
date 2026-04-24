/**
 * Node-side contract: `buildIntakePlan` is resolved via workspace `@glc/intake-core` (no browser bundle).
 * Complements `packages/intake-core/src/tests/adaptive-intake-prune-behavior.test.ts`.
 */
import { test, expect } from '@playwright/test';
import { buildIntakePlan } from '@glc/intake-core';

test.describe('intake case patterns (buildIntakePlan)', () => {
  test('different starter answers produce different casePatternMatch.caseKeys (discovery)', () => {
    const eco = buildIntakePlan({
      responses: { a2: 'E-commerce', a7: 'Scaling' },
      productMode: 'full',
      collectionMode: 'discovery',
      surface: 'public_discovery',
    });
    const health = buildIntakePlan({
      responses: { a2: 'Healthcare', a7: 'Growing fast' },
      productMode: 'full',
      collectionMode: 'discovery',
      surface: 'public_discovery',
    });
    expect(eco.casePatternMatch?.caseKeys).toContain('scaling_ecommerce_ops_bottleneck');
    expect(health.casePatternMatch?.caseKeys).toContain('healthcare_compliance_driven');
    expect(eco.casePatternMatch?.caseKeys?.join(',')).not.toEqual(health.casePatternMatch?.caseKeys?.join(','));
  });
});
