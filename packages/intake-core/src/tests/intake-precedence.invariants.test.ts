import { describe, expect, it } from 'vitest';

import { buildIntakePlan } from '../core/build-intake-plan.js';
import { currentIntakeVersionTuple } from '../core/versions.js';

function plan(responses: Record<string, unknown>) {
  return buildIntakePlan({
    responses,
    productMode: 'full',
    collectionMode: 'self_serve',
    surface: 'client_form',
    intakeVersionTuple: currentIntakeVersionTuple(),
  });
}

describe('intake precedence invariants', () => {
  it('nextRecommended is always subset of visible (layout cannot resurrect hidden/ineligible ids)', () => {
    const p = plan({
      a2: 'Healthcare',
      a5: 'Under construction',
      a1: 'Clinic',
      f1: ['Too much manual work and operational overload'],
    });
    const visible = new Set(p.visible);
    for (const id of p.nextRecommended) {
      expect(visible.has(id)).toBe(true);
    }
  });

  it('hidden ids never appear in visible or required', () => {
    const p = plan({
      a2: 'Healthcare',
      a5: 'No website yet',
    });
    const hidden = new Set(p.hidden);
    expect(p.visible.some(id => hidden.has(id))).toBe(false);
    expect(p.required.some(id => hidden.has(id))).toBe(false);
  });

  it('eligibility/policy ceiling remains superset of layout-projected visible ids', () => {
    const p = plan({
      a2: 'Healthcare',
      a5: 'Yes, multi-page site',
      a1: 'Example',
    });
    const eligible = new Set(p.eligible);
    for (const id of p.visible) {
      expect(eligible.has(id)).toBe(true);
    }
  });
});

