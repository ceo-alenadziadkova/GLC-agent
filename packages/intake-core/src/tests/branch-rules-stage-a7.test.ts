import { describe, expect, it } from 'vitest';

import { evalBranchCondition } from '../branch-rules.js';
import type { IntakeResponsesMap } from '../types.js';

describe('branch rules — business stage (a7)', () => {
  const r = (a7: string): IntakeResponsesMap => ({ a7: { value: a7, source: 'client' } }) as IntakeResponsesMap;

  it('matches Launching', () => {
    expect(evalBranchCondition('stage_launching', r('Launching'))).toBe(true);
    expect(evalBranchCondition('stage_launching', r('Scaling'))).toBe(false);
  });

  it('matches Scaling', () => {
    expect(evalBranchCondition('stage_scaling', r('Scaling'))).toBe(true);
    expect(evalBranchCondition('stage_scaling', r('Launching'))).toBe(false);
  });

  it('matches Growing fast', () => {
    expect(evalBranchCondition('stage_growing_fast', r('Growing fast'))).toBe(true);
  });
});
