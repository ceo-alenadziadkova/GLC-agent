/**
 * Smoke tests: BaseAgent.saveDomainResult()
 *
 * Tests the domain versioning logic:
 *  - First run: pending placeholder found → update in-place
 *  - Retry run: no pending placeholder → insert new versioned row
 *
 * Supabase client is mocked — no real DB required.
 * Uses vi.hoisted() so mock variables are available before vi.mock() hoisting.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks (must be defined before vi.mock) ───────────────────────

const { mockUpdate, mockInsert, mockSelectSingle, setSelectData } = vi.hoisted(() => {
  // The data that .single() will resolve with, controllable per-test
  let selectData: unknown = null;

  const mockSelectSingle = vi.fn(() => Promise.resolve({ data: selectData, error: null }));
  const setSelectData = (data: unknown) => { selectData = data; };

  // Build a fluent select chain
  const selectChain = {
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: mockSelectSingle,
  };

  const mockInsert = vi.fn().mockResolvedValue({ error: null });
  const eqResolved = vi.fn().mockResolvedValue({ error: null });
  const mockUpdate = vi.fn().mockReturnValue({ eq: eqResolved });

  return { mockUpdate, mockInsert, mockSelectSingle, setSelectData };
});

// ─── Module mocks ─────────────────────────────────────────────────────────

vi.mock('../services/supabase.js', () => {
  const selectChain = {
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: mockSelectSingle,
  };
  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => selectChain),
        update: mockUpdate,
        insert: mockInsert,
      })),
    },
  };
});

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: vi.fn() };
  },
}));
vi.mock('../services/context-builder.js', () => ({
  ContextBuilder: class { build = vi.fn(); formatPrompt = vi.fn(); },
}));
vi.mock('../services/fact-checker.js', () => ({
  FactChecker: class { verify = vi.fn(); },
}));
vi.mock('../services/token-tracker.js', () => ({
  TokenTracker: class { checkBudget = vi.fn(); log = vi.fn(); },
}));

// ─── Import after mocks ───────────────────────────────────────────────────

import { BaseAgent } from '../agents/base.js';
import type { DomainResult, DomainKey } from '../types/audit.js';
import { DomainOutputSchema } from '../schemas/domain-output.js';
import { z } from 'zod';

// ─── Concrete test agent ──────────────────────────────────────────────────

class TestAgent extends BaseAgent {
  get phaseNumber() { return 1; }
  get domainKey(): DomainKey { return 'tech_infrastructure'; }
  get collectors() { return []; }
  get instructions() { return 'test'; }
  get outputSchema() { return DomainOutputSchema; }
}

class ReconAgent extends BaseAgent {
  get phaseNumber() { return 0; }
  get domainKey() { return 'recon' as const; }
  get collectors() { return []; }
  get instructions() { return 'test'; }
  get outputSchema() { return z.object({}); }
}

class StrategyAgent extends BaseAgent {
  get phaseNumber() { return 7; }
  get domainKey() { return 'strategy' as const; }
  get collectors() { return []; }
  get instructions() { return 'test'; }
  get outputSchema() { return z.object({}); }
}

// ─── Test data ────────────────────────────────────────────────────────────

const AUDIT_ID = 'test-audit-uuid';

const DOMAIN_RESULT: DomainResult = {
  score: 3,
  label: 'Moderate',
  summary: 'Test summary that meets the minimum length requirement for the schema.',
  strengths: ['Good SSL'],
  weaknesses: ['No CDN'],
  issues: [{ id: 'i1', severity: 'medium', title: 'No CDN', description: 'Slow', impact: 'Medium' }],
  quick_wins: [],
  recommendations: [],
};

// ─── Tests ────────────────────────────────────────────────────────────────

describe('saveDomainResult — first run (pending placeholder exists)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simulate: pending placeholder found
    setSelectData({ id: 'placeholder-row-id' });
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  });

  it('calls UPDATE (not INSERT) when pending placeholder exists', async () => {
    const agent = new TestAgent(AUDIT_ID);
    await agent.saveDomainResult(DOMAIN_RESULT);

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('UPDATE payload has status="completed" and correct score/label', async () => {
    const agent = new TestAgent(AUDIT_ID);
    await agent.saveDomainResult(DOMAIN_RESULT);

    const payload = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.status).toBe('completed');
    expect(payload.score).toBe(3);
    expect(payload.label).toBe('Moderate');
    expect(payload.strengths).toEqual(['Good SSL']);
  });

  it('UPDATE is scoped to placeholder id', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: eqFn });

    const agent = new TestAgent(AUDIT_ID);
    await agent.saveDomainResult(DOMAIN_RESULT);

    expect(eqFn).toHaveBeenCalledWith('id', 'placeholder-row-id');
  });
});

describe('saveDomainResult — retry (no pending placeholder)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // First call: no placeholder; second call: latest version = 1
    let callCount = 0;
    mockSelectSingle.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ data: null, error: null });
      return Promise.resolve({ data: { version: 1 }, error: null });
    });
    mockInsert.mockResolvedValue({ error: null });
  });

  it('calls INSERT (not UPDATE) when no pending placeholder', async () => {
    const agent = new TestAgent(AUDIT_ID);
    await agent.saveDomainResult(DOMAIN_RESULT);

    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('INSERT payload has version = latest + 1', async () => {
    const agent = new TestAgent(AUDIT_ID);
    await agent.saveDomainResult(DOMAIN_RESULT);

    const payload = mockInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.version).toBe(2); // latest.version=1 + 1
  });

  it('INSERT payload has audit_id, domain_key, status=completed', async () => {
    const agent = new TestAgent(AUDIT_ID);
    await agent.saveDomainResult(DOMAIN_RESULT);

    const payload = mockInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.audit_id).toBe(AUDIT_ID);
    expect(payload.domain_key).toBe('tech_infrastructure');
    expect(payload.status).toBe('completed');
  });
});

describe('saveDomainResult — skipped for recon and strategy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing for "recon" domain key', async () => {
    setSelectData(null);
    const agent = new ReconAgent(AUDIT_ID);
    await agent.saveDomainResult(DOMAIN_RESULT);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('does nothing for "strategy" domain key', async () => {
    setSelectData(null);
    const agent = new StrategyAgent(AUDIT_ID);
    await agent.saveDomainResult(DOMAIN_RESULT);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
