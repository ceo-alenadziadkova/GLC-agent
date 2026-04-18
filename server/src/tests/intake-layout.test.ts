/**
 * Public discovery layout — deferral + step wiring (layout-rules.v1.json).
 */
import { describe, expect, it } from 'vitest';

import { buildIntakePlan } from '@glc/intake-core';

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
    // Layout yields one extra step when d1b is visible (no CRM selected).
    // Absolute counts can evolve as discovery adds questions (for example, f9).
    const withCrm = buildIntakePlan({
      responses: { a5: 'no_website', d1: ['CRM'] },
      ...discoveryCtx,
    });
    const noCrm = buildIntakePlan({
      responses: { a5: 'no_website', d1: ['Email'] },
      ...discoveryCtx,
    });
    expect(noCrm.visible.length).toBe(withCrm.visible.length + 1);
    expect(withCrm.visible.length).toBeGreaterThanOrEqual(9);
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

describe('intake layout (client_form vs consultant_interview)', () => {
  const hasWebsite = {
    a5: 'Yes — we have a multi-page website',
    a2: 'retail',
    a4: '2–5 people',
    a10: ['Product sales (online or offline)'],
  };

  it('client_form omits c1 when website branch makes it eligible', () => {
    const consultant = buildIntakePlan({
      responses: hasWebsite,
      productMode: 'full',
      surface: 'consultant_interview',
    });
    const client = buildIntakePlan({
      responses: hasWebsite,
      productMode: 'full',
      surface: 'client_form',
    });
    expect(consultant.visible).toContain('c1');
    expect(client.visible).not.toContain('c1');
  });

  it('consultant_interview keeps section A before section B in visible order', () => {
    const plan = buildIntakePlan({
      responses: { a5: 'no_website', a10: ['Product sales (online or offline)'] },
      productMode: 'full',
      surface: 'consultant_interview',
    });
    const iA = plan.visible.indexOf('a1');
    const iB = plan.visible.indexOf('b1');
    expect(iA).toBeGreaterThanOrEqual(0);
    expect(iB).toBeGreaterThanOrEqual(0);
    expect(iA).toBeLessThan(iB);
  });

  it('client_portal defers eligible ids outside compact steps', () => {
    const plan = buildIntakePlan({
      responses: { a5: 'no_website', a10: ['Product sales (online or offline)'] },
      productMode: 'full',
      surface: 'client_portal',
    });
    expect(plan.deferred.length).toBeGreaterThan(0);
    expect(plan.visible.every(id => !plan.deferred.includes(id))).toBe(true);
    const eligibleSet = new Set(plan.eligible);
    for (const id of plan.visible) expect(eligibleSet.has(id)).toBe(true);
    for (const id of plan.deferred) expect(eligibleSet.has(id)).toBe(true);
  });
});
