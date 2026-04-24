import { describe, expect, it } from 'vitest';

import { buildIntakePlan } from '../core/build-intake-plan.js';
import { currentIntakeVersionTuple } from '../core/versions.js';

function compactPlanSnapshot(input: Parameters<typeof buildIntakePlan>[0]) {
  const plan = buildIntakePlan(input);
  return {
    mode: input.productMode,
    collectionMode: input.collectionMode,
    surface: input.surface,
    versions: plan.versions,
    counts: {
      eligible: plan.eligible.length,
      visible: plan.visible.length,
      required: plan.required.length,
      nextRecommended: plan.nextRecommended.length,
      remediationQueue: (plan.remediation?.queue ?? []).length,
    },
    topVisible: plan.visible.slice(0, 10),
    topRequired: plan.required.slice(0, 10),
    topRecommended: plan.nextRecommended.slice(0, 10),
    remediationQueue: plan.remediation?.queue ?? [],
  };
}

describe('no-regression snapshots across intake surfaces', () => {
  const tuple = currentIntakeVersionTuple();

  it('pre_brief + client_form baseline remains stable', () => {
    const snapshot = compactPlanSnapshot({
      responses: { a2: 'Healthcare', a5: 'multi_page_website' },
      productMode: 'express',
      collectionMode: 'pre_brief',
      surface: 'client_form',
      intakeVersionTuple: tuple,
    });
    expect(snapshot).toMatchSnapshot();
  });

  it('self_serve + client_form baseline remains stable', () => {
    const snapshot = compactPlanSnapshot({
      responses: { a2: 'Healthcare', a5: 'multi_page_website' },
      productMode: 'full',
      collectionMode: 'self_serve',
      surface: 'client_form',
      intakeVersionTuple: tuple,
    });
    expect(snapshot).toMatchSnapshot();
  });

  it('consultant_interview baseline remains stable', () => {
    const snapshot = compactPlanSnapshot({
      responses: { a2: 'Healthcare', a5: 'multi_page_website' },
      productMode: 'full',
      collectionMode: 'interview',
      surface: 'consultant_interview',
      intakeVersionTuple: tuple,
    });
    expect(snapshot).toMatchSnapshot();
  });

  it('public_discovery baseline remains stable', () => {
    const snapshot = compactPlanSnapshot({
      responses: { a2: 'Healthcare', a5: 'multi_page_website' },
      productMode: 'discovery',
      collectionMode: 'discovery',
      surface: 'public_discovery',
      intakeVersionTuple: tuple,
    });
    expect(snapshot).toMatchSnapshot();
  });
});
