import { describe, expect, it } from 'vitest';
import { INTAKE_POLICY_V1 } from '@glc/intake-core';
import { QUESTION_BANK_V1_IDS } from '@glc/intake-core';
import { PUBLIC_DISCOVERY_WIZARD_BANK_IDS } from '@glc/intake-core';

describe('question stack invariants', () => {
  it('policy discovery ids exist in question-bank canon', () => {
    for (const id of INTAKE_POLICY_V1.modes.discovery.included) {
      expect(QUESTION_BANK_V1_IDS.has(id), `discovery policy id ${id} not in question-bank.v1.json`).toBe(true);
    }
  });

  it('policy pre-brief bankIncluded ids exist in question-bank canon', () => {
    const bankIncluded = INTAKE_POLICY_V1.modes.pre_brief.bankIncluded;
    expect(bankIncluded, 'bundled policy must define pre_brief.bankIncluded').toBeDefined();
    for (const id of bankIncluded!) {
      expect(QUESTION_BANK_V1_IDS.has(id), `pre_brief bankIncluded id ${id} not in question-bank.v1.json`).toBe(true);
    }
  });

  it('public discovery wizard ids are a subset of discovery policy ids', () => {
    const included = new Set(INTAKE_POLICY_V1.modes.discovery.included);
    for (const id of PUBLIC_DISCOVERY_WIZARD_BANK_IDS) {
      expect(included.has(id), `public discovery id ${id} not in discovery policy include`).toBe(true);
    }
  });
});
