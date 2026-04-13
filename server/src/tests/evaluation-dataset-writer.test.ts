import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  runNumberResponses: [1],
  insertResponses: [{ data: { id: 'row-1' }, error: null }] as Array<{
    data: { id: string } | null;
    error: { code?: string; message: string } | null;
  }>,
  insertPayloads: [] as Array<Record<string, unknown>>,
  insertAttempt: 0,
}));

vi.mock('../services/supabase.js', () => {
  const table = {
    _afterInsertSelect: false,
    select: vi.fn(() => {
      if (table._afterInsertSelect) {
        table._afterInsertSelect = false;
        return {
          maybeSingle: vi.fn(async () => {
            const idx = Math.max(0, state.insertAttempt - 1);
            return state.insertResponses[idx] ?? { data: null, error: null };
          }),
        };
      }
      return table;
    }),
    eq: vi.fn(() => table),
    order: vi.fn(() => table),
    limit: vi.fn(async () => {
      const next = state.runNumberResponses.shift() ?? 1;
      return { data: [{ run_number: next }], error: null };
    }),
    insert: vi.fn((payload: Record<string, unknown>) => {
      state.insertPayloads.push(payload);
      state.insertAttempt += 1;
      table._afterInsertSelect = true;
      return table;
    }),
    update: vi.fn(() => table),
  };

  return {
    supabase: {
      from: vi.fn(() => table),
    },
  };
});

import {
  sanitizeJsonForEvaluationDataset,
  recordEvaluationDatasetIfEnabled,
} from '../services/evaluation-dataset-writer.js';

describe('sanitizeJsonForEvaluationDataset', () => {
  it('redacts URLs and emails in strings', () => {
    const out = sanitizeJsonForEvaluationDataset({
      text: 'See https://example.com/path and mail@acme.co',
    }) as Record<string, unknown>;
    expect(out.text).toBe('See [redacted_url] and [redacted_email]');
  });

  it('redacts values for sensitive keys', () => {
    const out = sanitizeJsonForEvaluationDataset({
      summary: 'ok',
      company_url: 'https://client.com',
      nested: { phone: '+1-555-0100' },
    }) as Record<string, unknown>;
    expect(out.company_url).toBe('[redacted]');
    expect(out.summary).toBe('ok');
    expect((out.nested as Record<string, unknown>).phone).toBe('[redacted]');
  });

  it('recurses into arrays', () => {
    const out = sanitizeJsonForEvaluationDataset({
      items: [{ url: 'https://a.com' }],
    }) as Record<string, unknown>;
    expect((out.items as unknown[])[0]).toEqual({ url: '[redacted_url]' });
  });
});

describe('recordEvaluationDatasetIfEnabled', () => {
  beforeEach(() => {
    state.runNumberResponses = [1];
    state.insertResponses = [{ data: { id: 'row-1' }, error: null }];
    state.insertPayloads = [];
    state.insertAttempt = 0;
    delete process.env.EVALUATION_DATASETS_INSERT;
  });

  it('stores selected variant id in evaluation_datasets', async () => {
    await recordEvaluationDatasetIfEnabled({
      auditId: 'audit-1',
      phaseId: 'tech_infrastructure',
      controlObject: {
        context: { selected_variant_id: 'variant-a' },
        decision_hint: 'accept',
      } as never,
      rawAgentOutput: { summary: 'raw' },
      cleanedOutput: { summary: 'cleaned' } as never,
    });

    expect(state.insertPayloads.length).toBe(1);
    expect(state.insertPayloads[0].agent_variant_id).toBe('variant-a');
  });

  it('retries insert on unique run_number conflict and succeeds', async () => {
    state.runNumberResponses = [1, 2];
    state.insertResponses = [
      { data: null, error: { code: '23505', message: 'duplicate key value' } },
      { data: { id: 'row-2' }, error: null },
    ];

    await recordEvaluationDatasetIfEnabled({
      auditId: 'audit-2',
      phaseId: 'security_compliance',
      controlObject: {
        context: { selected_variant_id: 'default' },
        decision_hint: 'refine',
      } as never,
      rawAgentOutput: { summary: 'raw' },
      cleanedOutput: { summary: 'cleaned' } as never,
    });

    expect(state.insertPayloads.length).toBe(2);
    expect(state.insertPayloads[0].run_number).toBe(2);
    expect(state.insertPayloads[1].run_number).toBe(3);
  });
});
