import { describe, expect, it } from 'vitest';

import { CtoReadinessOutputSchema } from '../schemas/sub-agents/cto/readiness.js';

describe('director CTO schema rigor', () => {
  it('rejects readiness payload with too few architecture focus items', () => {
    const parsed = CtoReadinessOutputSchema.safeParse({
      readiness_summary: 'Readiness narrative long enough here',
      architecture_focus: ['only-one'],
      delivery_risks: ['risk one', 'risk two'],
      analysis_mode: 'researched',
    });
    expect(parsed.success).toBe(false);
  });
});
