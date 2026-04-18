import { describe, expect, it } from 'vitest';

import { formatIntakeQuestionReasonsBrief } from './intake-plan-explain';

describe('formatIntakeQuestionReasonsBrief', () => {
  it('returns a fallback when reasons are missing', () => {
    expect(formatIntakeQuestionReasonsBrief(undefined)[0]).toMatch(/audit flow logic/i);
  });

  it('formats reason rows for end users without raw codes', () => {
    const lines = formatIntakeQuestionReasonsBrief([
      { questionId: 'a1', layer: 'canon', state: 'eligible', code: 'BRANCH_TRUE' },
      { questionId: 'a1', layer: 'policy', state: 'visible', code: 'POLICY_INCLUDED', detail: 'full' },
    ]);
    expect(lines[0]).not.toContain('canon');
    expect(lines[0]).not.toContain('eligible');
    expect(lines[0]).not.toContain('BRANCH_TRUE');
    expect(lines[1]).not.toContain('POLICY_INCLUDED');
  });

  it('maps known reason codes to friendly explanations', () => {
    const lines = formatIntakeQuestionReasonsBrief([
      { questionId: 'a1', layer: 'canon', state: 'eligible', code: 'BRANCH_OK' },
      { questionId: 'a1', layer: 'policy', state: 'visible', code: 'PARTICIPATION_OK' },
    ]);
    expect(lines[0]).toMatch(/relevant based on your previous answers/i);
    expect(lines[1]).toMatch(/included for your selected audit flow/i);
  });

  it('includes reason detail for layout-suppressed message', () => {
    const lines = formatIntakeQuestionReasonsBrief([
      {
        questionId: 'a5',
        layer: 'policy',
        state: 'hidden',
        code: 'LAYOUT_SURFACE_SUPPRESSED',
        detail: 'wizard',
      },
    ]);
    expect(lines[0]).toContain('wizard');
  });

  it('uses generic fallback for unknown reason codes', () => {
    const lines = formatIntakeQuestionReasonsBrief([
      { questionId: 'a9', layer: 'canon', state: 'eligible', code: 'SOME_NEW_REASON_CODE' as never },
    ]);
    expect(lines[0]).toMatch(/determined by your current answers and flow settings/i);
  });

  it('does not append detail for non-layout reasons', () => {
    const lines = formatIntakeQuestionReasonsBrief([
      {
        questionId: 'a3',
        layer: 'policy',
        state: 'hidden',
        code: 'ASK_STRATEGY_PROGRESSIVE',
        detail: 'after q1',
      },
    ]);
    expect(lines[0]).toMatch(/appear later/i);
    expect(lines[0]).not.toContain('after q1');
  });
});
