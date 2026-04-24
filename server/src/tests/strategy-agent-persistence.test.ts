import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DomainKey } from '../types/audit.js';
import { AGENT_OUTPUT_LIMITS } from '../config/agent-output-limits.js';
import { StrategyInitiativeSchema, StrategyOutputSchema } from '../schemas/domain-output.js';

const AUDIT_ID = 'audit-strategy-001';

function makeStrategyOutputFixture(overallScore: number) {
  const executiveSummary = 'x'.repeat(AGENT_OUTPUT_LIMITS.strategyExecutiveSummaryMinChars);

  const initiative = (id: string, title: string) =>
    StrategyInitiativeSchema.parse({
      id,
      title,
      description: 'Desc'.repeat(4),
      domain: 'marketing_utp',
      stage: 'growth',
      priority: 'high',
      impact: 'high',
      effort: 'medium',
      confidence: 0.7,
      context: { signals: ['Low conversion on primary landing'] },
      outcome: { description: 'Lift conversion' },
      scope: { includes: ['Landing CTA'], excludes: ['Full rebrand'] },
      execution_paths: [
        { type: 'fast', description: 'No-code', time_estimate: '5d' },
        { type: 'scalable', description: 'Custom build', time_estimate: '3w' },
      ],
      decision: { why_this: ['High leverage'] },
      evidence: { sources: [{ domain_key: 'marketing_utp', signal: 'Heuristic signal' }] },
    });

  return StrategyOutputSchema.parse({
    executive_summary: executiveSummary,
    overall_score: overallScore,
    quick_wins: [initiative('qw-1', 'Fix CTA'), initiative('qw-2', 'Tighten messaging')],
    medium_term: [initiative('mt-1', 'Improve attribution'), initiative('mt-2', 'Instrument funnel')],
    strategic: [initiative('st-1', 'Launch partner channel')],
    scorecard: [
      {
        domain_key: 'marketing_utp',
        label: 'Marketing',
        score: 3,
        weight: 1,
        weighted_score: 3,
      },
    ],
  });
}

const { getUpdateCalls, resetCalls, configureStrategySupabaseMock } = vi.hoisted(() => {
  const updateCalls: Array<{ table: string; payload: Record<string, unknown>; filters: Record<string, string> }> = [];

  const getUpdateCalls = () => updateCalls;
  const resetCalls = () => {
    updateCalls.length = 0;
  };

  type StrategySupabaseMockConfig = {
    auditIndustry: string | null;
    domainScores: Array<{ domain_key: DomainKey; score: number }> | null;
    domainIssueRows: Array<{ domain_key: DomainKey; issues: unknown }> | null;
  };

  const defaultConfig: StrategySupabaseMockConfig = {
    auditIndustry: 'SaaS',
    domainScores: [
      { domain_key: 'tech_infrastructure', score: 3 },
      { domain_key: 'security_compliance', score: 4 },
    ],
    domainIssueRows: [],
  };

  let config: StrategySupabaseMockConfig = { ...defaultConfig };

  const configureStrategySupabaseMock = (patch: Partial<StrategySupabaseMockConfig>) => {
    config = { ...config, ...patch };
  };

  const makeChain = (table: string) => {
    const filters: Record<string, string> = {};
    const chain: Record<string, unknown> = {};
    let selectedFields = '';
    let auditDomainsEqCalls = 0;

    chain.select = vi.fn((fields?: string) => {
      if (typeof fields === 'string') selectedFields = fields;
      return chain;
    });
    chain.eq = vi.fn((col: string, val: string) => {
      filters[col] = val;
      if (table === 'audit_domains') {
        auditDomainsEqCalls += 1;
        if (auditDomainsEqCalls === 2) {
          if (selectedFields.includes('issues')) {
            return Promise.resolve({ data: config.domainIssueRows ?? [], error: null });
          }
          if (selectedFields.includes('score')) {
            return Promise.resolve({ data: config.domainScores ?? [], error: null });
          }
        }
      }
      return chain;
    });
    chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    chain.single = vi.fn(() => Promise.resolve({ data: { industry: config.auditIndustry }, error: null }));
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

    return chain;
  };

  const mockFrom = vi.fn((table: string) => makeChain(table));
  (globalThis as Record<string, unknown>).__strategyAgentMockFrom = mockFrom;

  return { getUpdateCalls, resetCalls, configureStrategySupabaseMock };
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
import { calculateWeightedScore } from '../config/industry-weights.js';

describe('StrategyAgent persistence regression', () => {
  beforeEach(() => {
    resetCalls();
    configureStrategySupabaseMock({
      auditIndustry: 'SaaS',
      domainScores: [
        { domain_key: 'tech_infrastructure', score: 3 },
        { domain_key: 'security_compliance', score: 4 },
      ],
      domainIssueRows: [],
    });
  });

  it('keeps strategy and audit update contracts backward-compatible', async () => {
    const agent = new StrategyAgent(AUDIT_ID) as unknown as {
      contextBuilder: { build: (auditId: string, domain: string, c: unknown, i: string) => Promise<unknown> };
      tokenTracker: { checkBudget: (auditId: string) => Promise<{ within_budget: boolean; remaining: number; is_approaching_limit: boolean; tokens_used: number; token_budget: number }> };
      callClaudeWithRetry: () => Promise<Record<string, unknown>>;
      emit: () => Promise<void>;
      run: () => Promise<Record<string, unknown>>;
      finalizeStrategyPersistence: () => Promise<void>;
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
    agent.callClaudeWithRetry = vi.fn().mockResolvedValue(makeStrategyOutputFixture(4));
    agent.emit = vi.fn().mockResolvedValue(undefined);

    await agent.run();
    await agent.finalizeStrategyPersistence();

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

  it('uses calculateWeightedScore(...) when upstream domain scores are mixed', async () => {
    const domainScores = [
      { domain_key: 'tech_infrastructure' as const, score: 2 },
      { domain_key: 'security_compliance' as const, score: 5 },
      { domain_key: 'seo_digital' as const, score: 3 },
      { domain_key: 'ux_conversion' as const, score: 4 },
      { domain_key: 'marketing_utp' as const, score: 2 },
      { domain_key: 'automation_processes' as const, score: 5 },
    ];

    configureStrategySupabaseMock({
      auditIndustry: 'SaaS',
      domainScores,
      domainIssueRows: [],
    });

    const expectedWeighted = calculateWeightedScore(domainScores, 'SaaS');

    const agent = new StrategyAgent(AUDIT_ID) as unknown as {
      contextBuilder: { build: (auditId: string, domain: string, c: unknown, i: string) => Promise<unknown> };
      tokenTracker: { checkBudget: (auditId: string) => Promise<{ within_budget: boolean; remaining: number; is_approaching_limit: boolean; tokens_used: number; token_budget: number }> };
      callClaudeWithRetry: () => Promise<Record<string, unknown>>;
      emit: () => Promise<void>;
      run: () => Promise<Record<string, unknown>>;
      finalizeStrategyPersistence: () => Promise<void>;
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
    agent.callClaudeWithRetry = vi.fn().mockResolvedValue(makeStrategyOutputFixture(1));
    agent.emit = vi.fn().mockResolvedValue(undefined);

    await agent.run();
    await agent.finalizeStrategyPersistence();

    const strategyUpdate = getUpdateCalls().find(c => c.table === 'audit_strategy');
    expect(strategyUpdate).toBeDefined();
    expect(strategyUpdate!.payload.overall_score).toBe(expectedWeighted);

    const auditUpdate = getUpdateCalls().find(c => c.table === 'audits');
    expect(auditUpdate).toBeDefined();
    expect(auditUpdate!.payload.overall_score).toBe(expectedWeighted);
  });
});
