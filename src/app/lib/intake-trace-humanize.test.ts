import { describe, expect, it } from 'vitest';

import { humanizeReason, summarizeStatus } from './intake-trace-humanize';

describe('intake-trace-humanize', () => {
  it('formats known reason codes into plain language', () => {
    const line = humanizeReason({
      questionId: 'a1',
      layer: 'canon',
      state: 'eligible',
      code: 'BRANCH_TRUE',
    });
    expect(line).toContain('Branch condition passed');
  });

  it('summarizes status by set priority', () => {
    const status = summarizeStatus('a1', {
      required: new Set(['a1']),
      visible: new Set(['a1']),
      deferred: new Set<string>(),
      hidden: new Set<string>(),
      eligible: new Set(['a1']),
    });
    expect(status).toBe('Required now');
  });
});
