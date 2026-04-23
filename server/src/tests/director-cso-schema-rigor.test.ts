import { describe, expect, it } from 'vitest';

import { CsoThreatModelOutputSchema } from '../schemas/sub-agents/cso/threat-model.js';

describe('director CSO schema rigor', () => {
  it('rejects threat model with shallow impact strings', () => {
    const parsed = CsoThreatModelOutputSchema.safeParse({
      threat_summary: 'Summary long enough for schema minimum',
      top_threats: [{ vector: 'xss', impact: 'bad' }],
      analysis_mode: 'researched',
    });
    expect(parsed.success).toBe(false);
  });
});
