import { describe, expect, it } from 'vitest';

import { buildPublicDiscoveryUiFragment } from '@glc/intake-core';
import { INTAKE_POLICY_V1 } from '@glc/intake-core';
import { buildIntakePlan } from '@glc/intake-core';
import { buildDiscoveryWizardQuestions } from '@glc/intake-core';
import { INDUSTRY_OPTIONS } from '../config/industry-options.js';
import { getBankQuestionUiOptions } from '@glc/intake-core';

function bankOrFallback(id: string, fallback: readonly string[]): string[] {
  return [...(getBankQuestionUiOptions(id) ?? [...fallback])];
}

describe('discovery policy sync guards', () => {
  it('keeps policy included in sync with server UI fragment and frontend fallback ids', () => {
    const policyIncluded = new Set(INTAKE_POLICY_V1.modes.discovery.included);
    const fragmentIds = buildPublicDiscoveryUiFragment().questions.map(q => q.id);
    const fallbackIds = buildDiscoveryWizardQuestions({
      bankOrFallback,
      industryOptions: INDUSTRY_OPTIONS,
    })
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
    expect(plan.visible).toEqual(fragmentIds);
  });
});
