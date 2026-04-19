import { describe, expect, it } from 'vitest';

import {
  mergeStrategyLabContextForStorage,
  parseStoredStrategyLabContext,
  StrategyLabContextPatchSchema,
} from '../config/strategy-lab-context-policy.js';
import { buildStrategyBriefConstraintSnapshot, mergeBriefSnapshotWithLabOverrides } from '../services/strategy/strategy-brief-constraint-snapshot.js';

describe('strategy lab context policy', () => {
  it('parses stored JSON and ignores unknown keys', () => {
    expect(parseStoredStrategyLabContext({ company_stage: 'scale', extra: 1 })).toEqual({ company_stage: 'scale' });
    expect(parseStoredStrategyLabContext(null)).toEqual({});
  });

  it('merge patch applies and null clears', () => {
    const a = mergeStrategyLabContextForStorage({ company_stage: 'idea' }, { budget_band: 'low' });
    expect(a).toEqual({ company_stage: 'idea', budget_band: 'low' });
    const b = mergeStrategyLabContextForStorage(a, { company_stage: null });
    expect(b).toEqual({ budget_band: 'low' });
  });

  it('accepts patch schema with null', () => {
    const p = StrategyLabContextPatchSchema.safeParse({ team_scale: null });
    expect(p.success).toBe(true);
  });
});

describe('mergeBriefSnapshotWithLabOverrides', () => {
  it('override wins over brief snapshot', () => {
    const brief = buildStrategyBriefConstraintSnapshot({
      a7: { value: 'Growing fast' },
      f5: { value: 'Over €10,000' },
      a4: { value: 'Just me' },
    });
    const merged = mergeBriefSnapshotWithLabOverrides(brief, { budget_band: 'low', company_stage: 'mvp' });
    expect(merged.company_stage).toBe('mvp');
    expect(merged.budget_band).toBe('low');
    expect(merged.team_scale).toBe(brief.team_scale);
  });
});
