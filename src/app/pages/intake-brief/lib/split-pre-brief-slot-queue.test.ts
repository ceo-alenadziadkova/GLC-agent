import { describe, expect, it } from 'vitest';

import { splitPreBriefSlotsIntoQueueSteps } from './split-pre-brief-slot-queue.js';

describe('splitPreBriefSlotsIntoQueueSteps', () => {
  it('groups a5 and a11, a2 and intake_industry_specify', () => {
    const out = splitPreBriefSlotsIntoQueueSteps(['a5', 'a11', 'a12', 'a2', 'intake_industry_specify', 'f1']);
    expect(out[0]).toEqual(['a5', 'a11']);
    expect(out.find(s => s.includes('a2'))).toEqual(['a2', 'intake_industry_specify']);
    expect(out.flat().filter(id => id === 'f1').length).toBe(1);
  });
});
