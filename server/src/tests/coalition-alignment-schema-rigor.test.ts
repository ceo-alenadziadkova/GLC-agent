import { describe, expect, it } from 'vitest';

import { DomainAlignmentResponseSchema } from '../schemas/director-collaboration/alignment.js';

describe('coalition alignment schema rigor', () => {
  it('rejects reactions targeting own domain hypotheses', () => {
    const parsed = DomainAlignmentResponseSchema.safeParse({
      schema_version: 1,
      audit_id: '11111111-1111-4111-8111-111111111111',
      domain_key: 'seo_digital',
      cross_domain_reactions: [
        {
          target_hypothesis_id: 'seo_digital:H1',
          relation: 'blocks',
          rationale: 'This should be a self correction, not a cross-domain reaction.',
        },
      ],
      self_corrections: [],
      analysis_mode: 'researched',
    });
    expect(parsed.success).toBe(false);
  });
});

