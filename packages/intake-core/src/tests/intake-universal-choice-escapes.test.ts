import { describe, expect, it } from 'vitest';
import { buildBriefQuestionStemFromBankId } from '../bank-question-presentation.js';
import {
  appendUniversalIntakeChoiceEscapes,
  INTAKE_UNIVERSAL_CHOICE_DONT_KNOW_FOR_NOW_LABEL,
  INTAKE_UNIVERSAL_CHOICE_OTHER_LABEL,
} from '../intake-universal-choice-escapes.js';
import { prepareBriefForValidation } from '../prepare-brief-for-validation.js';

describe('intake universal choice escapes', () => {
  it('appendUniversalIntakeChoiceEscapes dedupes Other and adds defer label', () => {
    const a = appendUniversalIntakeChoiceEscapes(['A', 'Other']);
    expect(a).toContain('A');
    expect(a.filter(x => x === 'Other').length).toBe(1);
    expect(a).toContain(INTAKE_UNIVERSAL_CHOICE_DONT_KNOW_FOR_NOW_LABEL);
  });

  it('stem for a4 appends escapes to bank options', () => {
    const stem = buildBriefQuestionStemFromBankId('a4');
    expect(stem.type).toBe('single_choice');
    expect(stem.options).toContain(INTAKE_UNIVERSAL_CHOICE_OTHER_LABEL);
    expect(stem.options!.at(-1)).toBe(INTAKE_UNIVERSAL_CHOICE_DONT_KNOW_FOR_NOW_LABEL);
  });

  it('prepareBriefForValidation keeps universal labels for single_select', () => {
    const sanitised = prepareBriefForValidation({
      a4: { value: INTAKE_UNIVERSAL_CHOICE_DONT_KNOW_FOR_NOW_LABEL, source: 'client' },
    });
    const wrapped = sanitised.a4 as { value: unknown };
    expect(wrapped.value).toBe(INTAKE_UNIVERSAL_CHOICE_DONT_KNOW_FOR_NOW_LABEL);
  });

  it('prepareBriefForValidation maps unicode punctuation variants to canonical single_select option', () => {
    const sanitised = prepareBriefForValidation({
      f5: { value: 'No clear budget yet - depends on the recommendations', source: 'client' },
    });
    const wrapped = sanitised.f5 as { value: unknown };
    expect(wrapped.value).toBe('No clear budget yet — depends on the recommendations');
  });

  it('prepareBriefForValidation maps unicode punctuation variants in multi_select options', () => {
    const sanitised = prepareBriefForValidation({
      b6: {
        value: ['Money–back', 'No explicit guarantees'],
        source: 'client',
      },
    });
    const wrapped = sanitised.b6 as { value: unknown };
    expect(wrapped.value).toEqual(['Money-back', 'No explicit guarantees']);
  });
});
