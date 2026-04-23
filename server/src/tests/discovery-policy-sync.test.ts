import { describe, expect, it } from 'vitest';

import {
  buildDiscoveryWizardQuestions,
  buildIntakePlan,
  buildPublicDiscoveryUiFragment,
  INTAKE_POLICY_V1,
  PUBLIC_DISCOVERY_WIZARD_BANK_IDS,
} from '@glc/intake-core';

describe('discovery policy sync guards', () => {
  it('keeps policy included in sync with server UI fragment and frontend fallback ids', () => {
    const policyIncluded = new Set(INTAKE_POLICY_V1.modes.discovery.included);
    const fragmentIds = buildPublicDiscoveryUiFragment().questions.map(q => q.id);
    const fallbackIds = buildDiscoveryWizardQuestions()
      .filter(q => policyIncluded.has(q.id))
      .map(q => q.id);

    expect(fragmentIds).toEqual(fallbackIds);
    expect(fragmentIds.every(id => policyIncluded.has(id))).toBe(true);
  });

  it('keeps public_discovery order stable against resolver output', () => {
    const fragmentIds = buildPublicDiscoveryUiFragment().questions.map(q => q.id);
    const plan = buildIntakePlan({
      responses: { a5: 'no_website' },
      productMode: 'full',
      collectionMode: 'discovery',
      surface: 'public_discovery',
    });
    const policyIncluded = new Set(INTAKE_POLICY_V1.modes.discovery.included);
    const expectedWizardFragment = PUBLIC_DISCOVERY_WIZARD_BANK_IDS.filter(id => policyIncluded.has(id));
    expect(fragmentIds).toEqual(expectedWizardFragment);
    const inPlay = new Set([...plan.visible, ...plan.deferred]);
    for (const id of expectedWizardFragment) {
      expect(inPlay.has(id), `resolver should retain public wizard id ${id}`).toBe(true);
    }
  });
});
