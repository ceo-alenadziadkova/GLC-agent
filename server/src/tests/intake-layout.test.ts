/**
 * Public discovery layout — deferral + step wiring (layout-rules.v1.json).
 */
import { describe, expect, it } from 'vitest';

import { buildIntakePlan } from '../intake/core/build-intake-plan.js';

const discoveryCtx = {
  productMode: 'full' as const,
  collectionMode: 'discovery' as const,
  surface: 'public_discovery' as const,
};

describe('intake layout (public_discovery)', () => {
  it('defers bank ids not listed in layout steps', () => {
    const plan = buildIntakePlan({
      responses: { a5: 'no_website' },
      ...discoveryCtx,
    });
    expect(plan.deferred.length).toBeGreaterThan(0);
    expect(plan.visible.every(id => !plan.deferred.includes(id))).toBe(true);
  });

  it('uses layout step order for visible (not lexicographic sort)', () => {
    const plan = buildIntakePlan({
      responses: { a5: 'no_website' },
      ...discoveryCtx,
    });
    const iA2 = plan.visible.indexOf('a2');
    const iA1 = plan.visible.indexOf('a1');
    expect(iA2).toBeGreaterThanOrEqual(0);
    expect(iA1).toBeGreaterThanOrEqual(0);
    expect(iA2).toBeLessThan(iA1);
  });

  it('includes d1b after d1 when no CRM in d1', () => {
    const plan = buildIntakePlan({
      responses: { a5: 'no_website', d1: ['Email'] },
      ...discoveryCtx,
    });
    expect(plan.visible).toContain('d1');
    expect(plan.visible).toContain('d1b');
    expect(plan.visible.indexOf('d1')).toBeLessThan(plan.visible.indexOf('d1b'));
  });

  it('omits d1b when CRM selected in d1', () => {
    const plan = buildIntakePlan({
      responses: { a5: 'no_website', d1: ['CRM', 'Email'] },
      ...discoveryCtx,
    });
    expect(plan.visible).toContain('d1');
    expect(plan.visible).not.toContain('d1b');
  });

  it('has one more visible step without CRM than with CRM (d1b)', () => {
    const withCrm = buildIntakePlan({
      responses: { a5: 'no_website', d1: ['CRM'] },
      ...discoveryCtx,
    });
    const noCrm = buildIntakePlan({
      responses: { a5: 'no_website', d1: ['Email'] },
      ...discoveryCtx,
    });
    expect(noCrm.visible.length).toBe(withCrm.visible.length + 1);
  });

  it('does not apply public_discovery layout without surface flag', () => {
    const plan = buildIntakePlan({
      responses: { a5: 'no_website' },
      productMode: 'full',
      collectionMode: 'discovery',
    });
    expect(plan.deferred).toEqual([]);
    expect(plan.stepPlan).toBeNull();
  });
});
