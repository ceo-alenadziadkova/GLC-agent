import { describe, expect, it } from 'vitest';
import { buildDiscoveryWizardQuestions } from '../intake/discovery-wizard-questions.js';
import { buildPublicDiscoveryUiFragment } from '../intake/discovery-ui-fragment.js';
import { getBankQuestionUiOptions } from '../intake/bank-question-ui-overrides.js';
import { INDUSTRY_OPTIONS } from '../config/industry-options.js';
import { INTAKE_POLICY_V1 } from '../intake/core/load-policy.js';

const EXPECTED_IDS = [
  'a2',
  'a1',
  'a4',
  'a7',
  'd1',
  'd1b',
  'c_nosite_1',
  'c_nosite_4',
  'd2',
  'f1',
] as const;

describe('buildDiscoveryWizardQuestions', () => {
  it('returns the canonical id order before policy filter', () => {
    const rows = buildDiscoveryWizardQuestions({
      bankOrFallback: (id, fb) => {
        const o = getBankQuestionUiOptions(id);
        return o ? [...o] : [...fb];
      },
      industryOptions: INDUSTRY_OPTIONS,
    });
    expect(rows.map(r => r.id)).toEqual([...EXPECTED_IDS]);
  });

  it('matches buildPublicDiscoveryUiFragment question payloads (server parity)', () => {
    const included = new Set(INTAKE_POLICY_V1.modes.discovery.included);
    const full = buildDiscoveryWizardQuestions({
      bankOrFallback: (id, fb) => {
        const o = getBankQuestionUiOptions(id);
        return o ? [...o] : [...fb];
      },
      industryOptions: INDUSTRY_OPTIONS,
    }).filter(q => included.has(q.id));

    const { questions } = buildPublicDiscoveryUiFragment();
    expect(questions).toEqual(full);
  });
});
