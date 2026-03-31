/**
 * Smoke tests: BaseAgent.saveDomainResult()
 *
 * Tests the domain versioning logic:
 *  - First run: atomic UPDATE WHERE status='pending' claims placeholder → returns [{id}]
 *  - Retry run: atomic UPDATE returns [] → no placeholder → insert new versioned row
 *
 * Supabase client is mocked — no real DB required.
 * Uses vi.hoisted() so mock variables are available before vi.mock() hoisting.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks (must be defined before vi.mock) ───────────────────────

const { mockUpdate, mockInsert, mockSelectSingle, updateChain, setSelectData, setUpdateReturnsPlaceholder } = vi.hoisted(() => {
  // Controls what the atomic UPDATE chain's final .select('id') resolves with.
  // true  → [{ id: 'placeholder-row-id' }]  (first-run: placeholder claimed)
  // false → []                               (retry: no pending placeholder found)
  let returnsPlaceholder = true;

  const mockUpdateSelect = vi.fn(() =>
    Promise.resolve({
      data: returnsPlaceholder ? [{ id: 'placeholder-row-id' }] : [],
      error: null,
    })
  );

  const setUpdateReturnsPlaceholder = (v: boolean) => {
    returnsPlaceholder = v;
    mockUpdateSelect.mockImplementation(() =>
      Promise.resolve({
        data: v ? [{ id: 'placeholder-row-id' }] : [],
        error: null,
      })
    );
  };

  // Fluent update chain: .update(payload).eq('audit_id',...).eq('domain_key',...).eq('status','pending').select('id')
  const updateChain = {
    eq: vi.fn().mockReturnThis(),
    select: mockUpdateSelect,
  };
  const mockUpdate = vi.fn(() => updateChain);

  // SELECT chain used for the "get latest version" read in the retry INSERT path
  let selectData: unknown = null;
  const mockSelectSingle = vi.fn(() => Promise.resolve({ data: selectData, error: null }));
  const setSelectData = (data: unknown) => { selectData = data; };

  const selectChain = {
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: mockSelectSingle,
  };

  const mockInsert = vi.fn().mockResolvedValue({ error: null });

  // Expose selectChain via globalThis so vi.mock factory can close over it
  (globalThis as Record<string, unknown>).__selectChain = selectChain;

  return { mockUpdate, mockInsert, mockSelectSingle, updateChain, setSelectData, setUpdateReturnsPlaceholder };
});

// ─── Module mocks ─────────────────────────────────────────────────────────

vi.mock('../services/supabase.js', () => {
  const sc = (globalThis as Record<string, unknown>).__selectChain;
  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => sc),
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
  issues: [{
    id: 'i1',
    severity: 'medium',
    title: 'No CDN',
    description: 'Slow',
    impact: 'Medium',
    confidence: 'medium',
    evidence_refs: [{ type: 'tech_stack_detect', finding: 'cdn: none detected' }],
    data_source: 'auto_detected',
  }],
  quick_wins: [],
  recommendations: [],
  unknown_items: [],
};

// ─── Tests ────────────────────────────────────────────────────────────────

describe('saveDomainResult — first run (atomic UPDATE claims placeholder)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUpdateReturnsPlaceholder(true); // UPDATE returns [{ id }] → placeholder claimed
  });

  it('calls UPDATE (not INSERT) when atomic UPDATE claims placeholder', async () => {
    const agent = new TestAgent(AUDIT_ID);
    await agent.saveDomainResult(DOMAIN_RESULT);

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('UPDATE payload has status="completed" and correct score/label', async () => {
    const agent = new TestAgent(AUDIT_ID);
    await agent.saveDomainResult(DOMAIN_RESULT);

    const payload = (mockUpdate.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
    expect(payload.status).toBe('completed');
    expect(payload.score).toBe(3);
    expect(payload.label).toBe('Moderate');
    expect(payload.strengths).toEqual(['Good SSL']);
  });

  it('UPDATE WHERE conditions include audit_id, domain_key, and status="pending"', async () => {
    const agent = new TestAgent(AUDIT_ID);
    await agent.saveDomainResult(DOMAIN_RESULT);

    // The atomic update chain must filter by all three conditions
    const eqCalls = updateChain.eq.mock.calls as [string, string][];
    expect(eqCalls).toEqual(
      expect.arrayContaining([
        ['audit_id', AUDIT_ID],
        ['domain_key', 'tech_infrastructure'],
        ['status', 'pending'],
      ])
    );
  });
});

describe('saveDomainResult — retry (atomic UPDATE returns [], no placeholder)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Atomic UPDATE finds no pending placeholder
    setUpdateReturnsPlaceholder(false);
    // SELECT for latest version returns version = 1
    setSelectData({ version: 1 });
    mockInsert.mockResolvedValue({ error: null });
  });

  it('calls UPDATE (to attempt claim) then INSERT when no pending placeholder found', async () => {
    const agent = new TestAgent(AUDIT_ID);
    await agent.saveDomainResult(DOMAIN_RESULT);

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockInsert).toHaveBeenCalledOnce();
  });

  it('INSERT payload has version = latest + 1', async () => {
    const agent = new TestAgent(AUDIT_ID);
    await agent.saveDomainResult(DOMAIN_RESULT);

    const payload = (mockInsert.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
    expect(payload.version).toBe(2); // latest.version=1 + 1
  });

  it('INSERT payload has audit_id, domain_key, status=completed', async () => {
    const agent = new TestAgent(AUDIT_ID);
    await agent.saveDomainResult(DOMAIN_RESULT);

    const payload = (mockInsert.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
    expect(payload.audit_id).toBe(AUDIT_ID);
    expect(payload.domain_key).toBe('tech_infrastructure');
    expect(payload.status).toBe('completed');
  });
});

describe('saveDomainResult — prompt_version in payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUpdateReturnsPlaceholder(true);
  });

  it('includes prompt_version in the UPDATE payload', async () => {
    const agent = new TestAgent(AUDIT_ID);
    await agent.saveDomainResult(DOMAIN_RESULT);

    const payload = (mockUpdate.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
    // promptVersion reads server/prompts/tech_infrastructure.md — should return '1.0' or 'unknown'
    expect(typeof payload.prompt_version).toBe('string');
    expect(payload.prompt_version).toBeTruthy();
  });

  it('includes prompt_version in the INSERT payload on retry', async () => {
    setUpdateReturnsPlaceholder(false);
    setSelectData({ version: 1 });

    const agent = new TestAgent(AUDIT_ID);
    await agent.saveDomainResult(DOMAIN_RESULT);

    const payload = (mockInsert.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
    expect(typeof payload.prompt_version).toBe('string');
    expect(payload.prompt_version).toBeTruthy();
  });
});

describe('saveDomainResult — skipped for recon and strategy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing for "recon" domain key', async () => {
    const agent = new ReconAgent(AUDIT_ID);
    await agent.saveDomainResult(DOMAIN_RESULT);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('does nothing for "strategy" domain key', async () => {
    const agent = new StrategyAgent(AUDIT_ID);
    await agent.saveDomainResult(DOMAIN_RESULT);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
