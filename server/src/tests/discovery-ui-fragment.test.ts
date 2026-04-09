import { describe, expect, it } from 'vitest';
import { buildPublicDiscoveryUiFragment } from '../intake/discovery-ui-fragment.js';
import { INTAKE_POLICY_V1 } from '../intake/core/load-policy.js';

const EXPECTED_WIZARD_IDS = [
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

describe('buildPublicDiscoveryUiFragment', () => {
  it('returns stable wizard id order and full policy coverage for the wizard', () => {
    const included = new Set(INTAKE_POLICY_V1.modes.discovery.included);
    const {
      questions,
      version,
      policyVersion,
      questionBankVersion,
      intake_versions,
    } = buildPublicDiscoveryUiFragment();

    expect(version).toBe('1');
    expect(typeof policyVersion).toBe('string');
    expect(policyVersion.length).toBeGreaterThan(0);
    expect(typeof questionBankVersion).toBe('string');

    const expectedFiltered = EXPECTED_WIZARD_IDS.filter(id => included.has(id));
    expect(questions.map(q => q.id)).toEqual([...expectedFiltered]);

    const a2 = questions.find(q => q.id === 'a2');
    expect(a2?.options?.length).toBeGreaterThan(0);
    const a1 = questions.find(q => q.id === 'a1');
    expect(a1?.type).toBe('free_text');

    expect(questionBankVersion).toBe(intake_versions.questionBankVersion);
    expect(policyVersion).toBe(intake_versions.policyVersion);
    expect(typeof intake_versions.layoutVersion).toBe('string');
    expect(typeof intake_versions.resolverVersion).toBe('string');
  });
});
