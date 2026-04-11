import { describe, expect, it } from 'vitest';
import { buildDiscoveryWizardQuestions } from '@glc/intake-core';
import { buildPublicDiscoveryUiFragment } from '@glc/intake-core';
import { INTAKE_POLICY_V1 } from '@glc/intake-core';

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
  'f9',
] as const;

describe('buildDiscoveryWizardQuestions', () => {
  it('returns the canonical id order before policy filter', () => {
    const rows = buildDiscoveryWizardQuestions();
    expect(rows.map(r => r.id)).toEqual([...EXPECTED_IDS]);
  });

  it('matches buildPublicDiscoveryUiFragment question payloads (server parity)', () => {
    const included = new Set(INTAKE_POLICY_V1.modes.discovery.included);
    const full = buildDiscoveryWizardQuestions().filter(q => included.has(q.id));

    const { questions } = buildPublicDiscoveryUiFragment();
    expect(questions).toEqual(full);
  });

  it('includes final optional context question f9 with explain path', () => {
    const rows = buildDiscoveryWizardQuestions();
    const f9 = rows.find(r => r.id === 'f9');
    expect(f9).toBeDefined();
    expect(f9?.optional).toBe(true);
    expect(f9?.type).toBe('single_choice');
    expect(f9?.options).toContain('Yes, there are additional details');
  });
});
