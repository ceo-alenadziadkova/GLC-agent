import { describe, expect, it } from 'vitest';

import branchRules from '../branch-rules.v1.json' with { type: 'json' };

type StageKey = 'stage_launching' | 'stage_growing_fast' | 'stage_scaling' | 'stage_mature';

describe('branch rules stage-specific content', () => {
  it('defines stage content prompts for all rollout stage keys', () => {
    const requiredStages: StageKey[] = [
      'stage_launching',
      'stage_growing_fast',
      'stage_scaling',
      'stage_mature',
    ];
    const content = (branchRules as { stageQuestionContent?: Record<string, string[]> }).stageQuestionContent ?? {};
    for (const stageKey of requiredStages) {
      expect(Array.isArray(content[stageKey]), `${stageKey} must be defined`).toBe(true);
      expect(content[stageKey]?.length ?? 0, `${stageKey} should have >= 3 prompts`).toBeGreaterThanOrEqual(3);
    }
  });
});
