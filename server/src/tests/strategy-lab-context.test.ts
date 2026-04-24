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

  it('parses director_stage2_domains and dedupes', () => {
    expect(
      parseStoredStrategyLabContext({
        director_stage2_domains: ['seo_digital', 'seo_digital', 'ux_conversion'],
      }),
    ).toEqual({ director_stage2_domains: ['seo_digital', 'ux_conversion'] });
  });

  it('merge applies director_stage2_domains and null clears', () => {
    const a = mergeStrategyLabContextForStorage({}, { director_stage2_domains: ['tech_infrastructure'] });
    expect(a.director_stage2_domains).toEqual(['tech_infrastructure']);
    const b = mergeStrategyLabContextForStorage(a, { director_stage2_domains: null });
    expect(b.director_stage2_domains).toBeUndefined();
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

  it('derives idea-stage readiness signals from new idea-only questions', () => {
    const brief = buildStrategyBriefConstraintSnapshot({
      f_idea_1: { value: 'I have paid pilots or early customers' },
      f_idea_2: { value: 'Very clear (segment, context, budget, urgency)' },
      f_idea_3: { value: ['Landing page test', 'Direct outreach test'] },
      f_idea_4: { value: 'Budget' },
    });
    expect(brief.idea_validation_signal).toBe('strong');
    expect(brief.idea_icp_clarity).toBe('clear');
    expect(brief.idea_gtm_test_ready).toBe(true);
    expect(brief.idea_launch_constraint).toBe('Budget');
  });
});
