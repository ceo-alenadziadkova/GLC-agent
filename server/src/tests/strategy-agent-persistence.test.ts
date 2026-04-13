import { beforeEach, describe, expect, it, vi } from 'vitest';

const AUDIT_ID = 'audit-strategy-001';

const { getUpdateCalls, resetCalls } = vi.hoisted(() => {
  const updateCalls: Array<{ table: string; payload: Record<string, unknown>; filters: Record<string, string> }> = [];

  const getUpdateCalls = () => updateCalls;
  const resetCalls = () => {
    updateCalls.length = 0;
  };

  const makeChain = (table: string) => {
    const filters: Record<string, string> = {};
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn((col: string, val: string) => {
      filters[col] = val;
      return chain;
    });
    chain.single = vi.fn(() => Promise.resolve({ data: { industry: 'SaaS' }, error: null }));
    chain.update = vi.fn((payload: Record<string, unknown>) => {
      const capturedFilters = { ...filters };
      updateCalls.push({ table, payload, filters: capturedFilters });
      const afterUpdate: Record<string, unknown> = {};
      afterUpdate.eq = vi.fn((col: string, val: string) => {
        capturedFilters[col] = val;
        updateCalls[updateCalls.length - 1].filters = { ...capturedFilters };
        return Promise.resolve({ error: null });
      });
      return afterUpdate;
    });

    if (table === 'audit_domains') {
      chain.eq = vi
        .fn()
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(Promise.resolve({
          data: [
            { domain_key: 'tech_infrastructure', score: 3 },
            { domain_key: 'security_compliance', score: 4 },
          ],
          error: null,
        }));
    }

    return chain;
  };

  const mockFrom = vi.fn((table: string) => makeChain(table));
  (globalThis as Record<string, unknown>).__strategyAgentMockFrom = mockFrom;

  return { getUpdateCalls, resetCalls };
});

vi.mock('../services/supabase.js', () => ({
  supabase: { from: (globalThis as Record<string, unknown>).__strategyAgentMockFrom as (t: string) => unknown },
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: vi.fn() };
  },
}));

import { StrategyAgent } from '../agents/strategy.js';

describe('StrategyAgent persistence regression', () => {
  beforeEach(() => {
    resetCalls();
  });

  it('keeps strategy and audit update contracts backward-compatible', async () => {
    const agent = new StrategyAgent(AUDIT_ID) as unknown as {
      contextBuilder: { build: (auditId: string, domain: string, c: unknown, i: string) => Promise<unknown> };
      tokenTracker: { checkBudget: (auditId: string) => Promise<{ within_budget: boolean; remaining: number; is_approaching_limit: boolean; tokens_used: number; token_budget: number }> };
      callClaudeWithRetry: () => Promise<Record<string, unknown>>;
      emit: () => Promise<void>;
      run: () => Promise<Record<string, unknown>>;
    };

    agent.contextBuilder = {
      build: vi.fn().mockResolvedValue({ prompt: 'context' }),
    };
    agent.tokenTracker = {
      checkBudget: vi.fn().mockResolvedValue({
        within_budget: true,
        remaining: 100000,
        is_approaching_limit: false,
        tokens_used: 1000,
        token_budget: 200000,
      }),
    };
    agent.callClaudeWithRetry = vi.fn().mockResolvedValue({
      executive_summary: 'Stable strategy output',
      overall_score: 4,
      quick_wins: [{ title: 'Fix CTA' }],
      medium_term: [{ title: 'Improve attribution' }],
      strategic: [{ title: 'Launch partner channel' }],
      scorecard: [{ area: 'Growth', target: 'MQL +20%' }],
    });
    agent.emit = vi.fn().mockResolvedValue(undefined);

    await agent.run();

    const strategyUpdate = getUpdateCalls().find(c => c.table === 'audit_strategy');
    expect(strategyUpdate).toBeDefined();
    expect(strategyUpdate!.filters.audit_id).toBe(AUDIT_ID);
    expect(strategyUpdate!.payload).toEqual(
      expect.objectContaining({
        status: 'completed',
        executive_summary: expect.any(String),
        overall_score: expect.any(Number),
        quick_wins: expect.any(Array),
        medium_term: expect.any(Array),
        strategic: expect.any(Array),
        scorecard: expect.any(Array),
      }),
    );

    const auditUpdate = getUpdateCalls().find(c => c.table === 'audits');
    expect(auditUpdate).toBeDefined();
    expect(auditUpdate!.filters.id).toBe(AUDIT_ID);
    expect(auditUpdate!.payload).toEqual(
      expect.objectContaining({
        status: 'completed',
        current_phase: 7,
        overall_score: expect.any(Number),
      }),
    );
  });
});
