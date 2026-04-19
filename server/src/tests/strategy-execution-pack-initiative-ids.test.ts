import { describe, expect, it } from 'vitest';

import { StrategyInitiativeSchema } from '../schemas/domain-output.js';
import { normalizeAuditStrategyRowForReadModel } from '../services/strategy/strategy-audit-read-normalize.js';

function flattenInitiativeIds(strategy: Record<string, unknown>): string[] {
  const ids: string[] = [];
  for (const k of ['quick_wins', 'medium_term', 'strategic'] as const) {
    const arr = strategy[k];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const p = StrategyInitiativeSchema.safeParse(item);
      if (p.success) ids.push(p.data.id);
    }
  }
  return ids;
}

describe('execution pack initiative resolution', () => {
  it('matches Strategy Lab selection after read-model normalization (legacy rows)', () => {
    const rawStrategy = {
      status: 'completed',
      schema_version: 1,
      quick_wins: [
        {
          id: 'LEG-EXEC-1',
          title: 'Legacy roadmap item title',
          description:
            'Short legacy body that still meets minimum description length for coercion and schema.',
          impact: 'high',
          effort: 'low',
        },
      ],
      medium_term: [],
      strategic: [],
      scorecard: [],
    };

    const before = flattenInitiativeIds(rawStrategy as Record<string, unknown>);
    expect(before).toEqual([]);

    const normalized = normalizeAuditStrategyRowForReadModel({
      strategy: rawStrategy as Record<string, unknown>,
      domainRows: [],
      briefResponses: {},
    }) as Record<string, unknown>;

    const after = flattenInitiativeIds(normalized);
    expect(after).toContain('LEG-EXEC-1');
  });
});
