import { describe, expect, it } from 'vitest';
import type { FreeSnapshotPreview } from '../../../data/auditTypes';
import { createCategoryScoreRows, flattenDetectedTech } from './snapshotResultsSelectors';

function makeResult(overrides: Partial<FreeSnapshotPreview>): FreeSnapshotPreview {
  const base: FreeSnapshotPreview = {
    audit_id: 'audit-1',
    snapshot_token: 'snap-1',
    status: 'completed',
    company_url: 'https://example.com',
    company_name: 'Example Co',
    tech_stack: {},
    ux_score: 3,
    ux_label: 'Moderate',
    ux_summary: 'summary',
    issues: [],
    quick_wins: [],
    location: null,
  };

  return { ...base, ...overrides };
}

describe('snapshotResultsSelectors', () => {
  it('returns category score rows with normalized percentages', () => {
    const result = makeResult({
      category_scores: {
        ux_clarity: 110,
        conversion_readiness: -1,
        ai_readiness: 43,
        technical_basics: 78,
      },
    });

    const rows = createCategoryScoreRows(result);
    expect(rows).toHaveLength(4);
    expect(rows[0]?.percentage).toBe(100);
    expect(rows[1]?.percentage).toBe(0);
    expect(rows[2]?.value).toBe(43);
  });

  it('flattens detected tech entries preserving order', () => {
    expect(
      flattenDetectedTech([
        ['frontend', ['React', 'Vite']],
        ['infra', ['Cloudflare']],
      ]),
    ).toEqual(['React', 'Vite', 'Cloudflare']);
  });
});
