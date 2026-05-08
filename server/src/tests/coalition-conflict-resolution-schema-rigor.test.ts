import { describe, expect, it } from 'vitest';

import { CrossDomainConflictResolutionSchema } from '../schemas/director-collaboration/conflict-resolution.js';

describe('coalition conflict resolution schema rigor', () => {
  it('rejects escalated_to_consultant in resolved_conflicts', () => {
    const parsed = CrossDomainConflictResolutionSchema.safeParse({
      schema_version: 1,
      audit_id: '11111111-1111-4111-8111-111111111111',
      resolved_conflicts: [
        {
          id: 'CONF-1',
          type: 'tradeoff',
          parties: ['marketing_utp:H1', 'tech_infrastructure:H2'],
          resolution: 'escalated_to_consultant',
          decision: 'Escalation must be encoded in unresolved entries instead.',
          tradeoffs_accepted: [],
          affects_actions: [],
        },
      ],
      unresolved: [],
      analysis_mode: 'researched',
    });
    expect(parsed.success).toBe(false);
  });
});

