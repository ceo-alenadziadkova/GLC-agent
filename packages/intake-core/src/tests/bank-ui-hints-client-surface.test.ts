import { describe, expect, it } from 'vitest';
import { buildBriefQuestionStemFromBankId } from '../bank-question-presentation.js';
import { buildDiscoveryQuestionRow, PUBLIC_DISCOVERY_WIZARD_BANK_IDS } from '../discovery-wizard-questions.js';

/**
 * Consultant / presale copy must not live in `bank-question-ui-overrides` hints:
 * those flow to public Discovery and all client-facing stems via `buildBriefQuestionStemFromBankId`.
 */
describe('bank UI overrides — client-visible hints', () => {
  const problematic = /\bpresale\b|proposal-level|proposal phasing/i;

  it('discovery wizard rows omit presale/proposal-internal framing in hint', () => {
    for (const id of PUBLIC_DISCOVERY_WIZARD_BANK_IDS) {
      const row = buildDiscoveryQuestionRow(id);
      if (row.hint) {
        expect(row.hint, id).not.toMatch(problematic);
      }
    }
  });

  it('classic client stems for scoped goal questions stay neutral', () => {
    for (const id of ['f4', 'f5', 'f8'] as const) {
      const hint = buildBriefQuestionStemFromBankId(id).hint;
      expect(hint, id).toBeDefined();
      expect(hint!, id).not.toMatch(problematic);
    }
  });
});
