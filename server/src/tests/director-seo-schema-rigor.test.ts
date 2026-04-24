import { describe, expect, it } from 'vitest';

import { SeoVisibilityBaselineOutputSchema } from '../schemas/sub-agents/seo/visibility-baseline.js';

describe('director SEO schema rigor', () => {
  it('rejects visibility baseline with too few structural constraints', () => {
    const parsed = SeoVisibilityBaselineOutputSchema.safeParse({
      visibility_baseline_summary: 'Baseline summary long enough for rules',
      structural_constraints: ['one'],
      missing_evidence: ['evidence gap one', 'evidence gap two'],
      analysis_mode: 'researched',
    });
    expect(parsed.success).toBe(false);
  });
});
