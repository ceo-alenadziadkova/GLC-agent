import { describe, expect, it } from 'vitest';
import type { FreeSnapshotPreview, SnapshotCompetitorComparison } from '../../../data/auditTypes';
import { createSnapshotLandingViewModel } from './createSnapshotLandingViewModel';
import type { SnapshotLandingStage } from '../hooks/useSnapshotLandingController';

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

describe('createSnapshotLandingViewModel', () => {
  it('returns zero/empty grid class when stage is not done', () => {
    const stage: SnapshotLandingStage = 'running';
    const result = makeResult({});

    const vm = createSnapshotLandingViewModel({ stage, result, accountUser: null });
    expect(vm.snapshotInsightBlockCount).toBe(0);
    expect(vm.snapshotInsightGridClass).toBe('');
    expect(vm.snapshotTechColClass).toBe('');
  });

  it('computes block count 2 and grid for issues + tech', () => {
    const stage: SnapshotLandingStage = 'done';
    const result = makeResult({
      issues: [{ id: '1', severity: 'low', title: 'Issue', description: 'D', impact: 'I' }],
      quick_wins: [],
      tech_stack: { react: ['signal'] },
      tech_stack_tentative: [],
    });

    const vm = createSnapshotLandingViewModel({ stage, result, accountUser: null });
    expect(vm.snapshotInsightBlockCount).toBe(2);
    expect(vm.snapshotInsightGridClass).toContain('lg:grid-cols-2');
    expect(vm.snapshotInsightGridClass).not.toContain('xl:grid-cols-3');
    expect(vm.snapshotTechColClass).toBe('');
  });

  it('computes block count 3 and grid/colspan for issues + quick_wins + tentative tech', () => {
    const stage: SnapshotLandingStage = 'done';
    const result = makeResult({
      issues: [{ id: '1', severity: 'low', title: 'Issue', description: 'D', impact: 'I' }],
      quick_wins: [{ id: 'q1', title: 'Quick', description: 'D', effort: 'S', timeframe: 'W' }],
      tech_stack: {},
      tech_stack_tentative: [{ name: 'Next', category: 'framework', signal: 'sig' }],
    });

    const vm = createSnapshotLandingViewModel({ stage, result, accountUser: null });
    expect(vm.snapshotInsightBlockCount).toBe(3);
    expect(vm.snapshotInsightGridClass).toContain('xl:grid-cols-3');
    expect(vm.snapshotTechColClass).toBe('lg:col-span-2 xl:col-span-1');
  });
});

