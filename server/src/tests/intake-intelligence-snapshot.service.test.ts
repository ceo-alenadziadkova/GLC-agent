import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildResponsesSummaryForIntakeSnapshot,
  mergeF2WithDeterministicOrder,
} from '../services/intake/intake-intelligence-snapshot.service.js';

vi.mock('../services/intake/intake-intelligence-snapshot-kpi.service.js', () => ({
  recordIntakeIntelligenceSnapshotKpi: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../config/feature-flags.js', () => ({
  isIntakeIntelligenceSnapshotLlmEnabled: () => false,
}));

describe('intake-intelligence-snapshot.service helpers', () => {
  it('buildResponsesSummaryForIntakeSnapshot flattens structured cells', () => {
    const s = buildResponsesSummaryForIntakeSnapshot({
      f1: { value: 'too much manual work', source: 'client' },
    });
    const parsed = JSON.parse(s) as Record<string, string>;
    expect(parsed.f1).toContain('manual');
  });

  it('mergeF2WithDeterministicOrder keeps invalid ids out and appends the rest in order', () => {
    const { orderedIds, invalidFiltered } = mergeF2WithDeterministicOrder({
      suggested: ['z99', 'b1', 'a7'],
      deterministicOrder: ['a7', 'b1', 'c3'],
    });
    expect(invalidFiltered).toBe(1);
    expect(orderedIds).toEqual(['b1', 'a7', 'c3']);
  });
});

describe('runIntakeIntelligenceSnapshot (deterministic, no LLM)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns deterministic F2 and merge preview without LLM', async () => {
    vi.doMock('../config/feature-flags.js', () => ({
      isIntakeIntelligenceSnapshotLlmEnabled: () => false,
    }));
    vi.doMock('../services/intake/intake-intelligence-snapshot-kpi.service.js', () => ({
      recordIntakeIntelligenceSnapshotKpi: vi.fn().mockResolvedValue(undefined),
    }));
    const { runIntakeIntelligenceSnapshot } = await import(
      '../services/intake/intake-intelligence-snapshot.service.js'
    );
    const base = {
      a5: { value: 'https://example.com', source: 'client' as const },
      a11: { value: 'a@b.com', source: 'client' as const },
      a12: { value: 'Acme', source: 'client' as const },
      a2: { value: 'saas', source: 'client' as const },
      f1: { value: 'pain', source: 'client' as const },
      f2: { value: ['tech_infrastructure'], source: 'client' as const },
      f8: { value: 'goal', source: 'client' as const },
      a7: { value: 'smb', source: 'client' as const },
      b1: { value: 'icp', source: 'client' as const },
      a10: { value: 'subscriptions', source: 'client' as const },
      a6: { value: '2', source: 'client' as const },
    };
    const out = await runIntakeIntelligenceSnapshot({
      responses: base,
      auditId: null,
      skipLlm: true,
    });
    expect(out.f2_source).toBe('deterministic');
    expect(out.merge_would_apply_count).toBe(0);
    expect(out.snapshot_no_new_inferred).toBe(true);
    expect(out.question_ids.length).toBe(out.deterministic_question_ids.length);
  });

  it('intelligenceLlmMode understanding does not keep label paraphrase keys (service clears overrides)', async () => {
    vi.resetModules();
    vi.doMock('../config/feature-flags.js', () => ({
      isIntakeIntelligenceSnapshotLlmEnabled: () => true,
    }));
    vi.doMock('../services/intake/intake-intelligence-snapshot-kpi.service.js', () => ({
      recordIntakeIntelligenceSnapshotKpi: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../services/intake/intake-intelligence-snapshot-llm.service.js', () => ({
      runIntakeIntelligenceUnderstandingLlm: async () => ({
        narrative: null,
        inferred: [],
        suggestedNextQuestionIds: [],
        labelOverrides: { b1: 'should not appear' },
      }),
    }));
    const { runIntakeIntelligenceSnapshot } = await import(
      '../services/intake/intake-intelligence-snapshot.service.js'
    );
    const base = {
      a5: { value: 'https://example.com', source: 'client' as const },
      a11: { value: 'a@b.com', source: 'client' as const },
      a12: { value: 'Acme', source: 'client' as const },
      a2: { value: 'saas', source: 'client' as const },
      f1: { value: 'pain', source: 'client' as const },
      f2: { value: ['tech_infrastructure'], source: 'client' as const },
      f8: { value: 'goal', source: 'client' as const },
      a7: { value: 'smb', source: 'client' as const },
      b1: { value: 'icp', source: 'client' as const },
      a10: { value: 'subscriptions', source: 'client' as const },
      a6: { value: '2', source: 'client' as const },
    };
    const out = await runIntakeIntelligenceSnapshot({
      responses: base,
      auditId: null,
      skipLlm: false,
      intelligenceLlmMode: 'understanding',
    });
    expect(out.label_overrides).toEqual({});
  });
});
