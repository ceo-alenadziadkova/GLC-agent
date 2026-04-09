import { describe, expect, it } from 'vitest';

import { formatIntakeQuestionReasonsBrief } from './intake-plan-explain';

describe('formatIntakeQuestionReasonsBrief', () => {
  it('returns a fallback when reasons are missing', () => {
    expect(formatIntakeQuestionReasonsBrief(undefined)[0]).toMatch(/No classification trace/);
  });

  it('formats reason rows', () => {
    const lines = formatIntakeQuestionReasonsBrief([
      { questionId: 'a1', layer: 'canon', state: 'eligible', code: 'BRANCH_TRUE' },
      { questionId: 'a1', layer: 'policy', state: 'visible', code: 'POLICY_INCLUDED', detail: 'full' },
    ]);
    expect(lines[0]).toContain('canon');
    expect(lines[0]).toContain('eligible');
    expect(lines[1]).toContain('(full)');
  });
});
