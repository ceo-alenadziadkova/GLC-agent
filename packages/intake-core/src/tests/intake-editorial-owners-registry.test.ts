import { describe, expect, it } from 'vitest';

import editorialOwners from '../artifacts/intake-editorial-owners.v1.json' with { type: 'json' };
import type { IntakeIntelligenceOwnerDomain } from '../config/intake-intelligence-types.js';

const DOMAIN_KEYS: IntakeIntelligenceOwnerDomain[] = [
  'product',
  'recon',
  'tech_infrastructure',
  'security_compliance',
  'seo_digital',
  'ux_conversion',
  'marketing_utp',
  'automation_processes',
  'strategy',
];

describe('intake editorial owners registry (docs/intake-editorial-owners.v1.json)', () => {
  it('covers every IntakeIntelligenceOwnerDomain with a label slot', () => {
    const m = editorialOwners.primaryContactByDomain as Record<string, { label: string }>;
    for (const d of DOMAIN_KEYS) {
      expect(m[d], `missing primaryContactByDomain entry for ${d}`).toBeDefined();
      expect(m[d]!.label?.length, `label for ${d}`).toBeGreaterThan(0);
    }
  });
});
