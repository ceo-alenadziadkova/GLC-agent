/**
 * Unit tests: PipelineOrchestrator.startPhase()
 *
 * This is the heart of the pipeline orchestrator. Tests verify:
 *
 *  Happy path:
 *    · Phase 0 (Recon): brief gate runs, status set to 'recon', agent.run() called
 *    · Phase 1 (domain): domain status set to 'collecting', agent.run() called,
 *      saveDomainResult() called
 *    · Phase 7 (Strategy): no domain status update, no saveDomainResult
 *    · review_needed event emitted when phase is a review gate
 *    · 'started' and 'completed' pipeline events emitted for every phase
 *
 *  Error paths:
 *    · Phase 0: assertBriefReady throws → audit marked 'failed', error event emitted, rethrows
 *    · Phase 1: agent.run() throws → domain marked 'failed', audit marked 'failed', rethrows
 *
 *  Mode ceiling:
 *    · Express audit: phase 5 → throws "not available for product_mode 'express'"
 *    · Express audit: phase 4 → succeeds (max allowed)
 *
 *  Unknown phase:
 *    · startPhase(99) → throws "Unknown phase"
 *
 * All external dependencies (supabase, agents, brief-validator, consistency-checker)
 * are fully mocked. No real DB or LLM calls.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

const AUDIT_ID = 'audit-test-001';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockAssertBriefReady,
  mockAgentRun,
  mockAgentSaveDomainResult,
  getUpdateCalls,
  getInsertCalls,
  setProductMode,
  clearCalls,
} = vi.hoisted(() => {
  const updateCalls: Array<{ table: string; payload: Record<string, unknown>; filters: Record<string, string> }> = [];
  const insertCalls: Array<{ table: string; payload: Record<string, unknown> }> = [];

  let productMode = 'full';
  const setProductMode = (m: string) => { productMode = m; };
  const getUpdateCalls = () => updateCalls;
  const getInsertCalls = () => insertCalls;
  const clearCalls = () => { updateCalls.length = 0; insertCalls.length = 0; };

  const mockAssertBriefReady = vi.fn().mockResolvedValue(undefined);

  const mockAgentRun = vi.fn().mockResolvedValue({
    score: 3,
    label: 'Moderate',
    summary: 'Test summary',
    strengths: [],
    weaknesses: [],
    issues: [],
    quick_wins: [],
    recommendations: [],
    unknown_items: [],
  });
  const mockAgentSaveDomainResult = vi.fn().mockResolvedValue(undefined);

  // Chainable Supabase mock that records all update/insert calls
  const makeChain = (table: string) => {
    const filters: Record<string, string> = {};
    let updatePayload: Record<string, unknown> = {};

    const chain: Record<string, unknown> = {};
    chain.eq = vi.fn((col: string, val: string) => {
      filters[col] = val;
      return chain;
    });
    chain.select = vi.fn().mockReturnValue(chain);
    chain.order  = vi.fn().mockReturnValue(chain);
    chain.limit  = vi.fn().mockReturnValue(chain);
    chain.in     = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn(() => {
      if (table === 'audits') {
        return Promise.resolve({
          data: { product_mode: productMode },
          error: null,
        });
      }
      // review_points: return no pending review (so pipeline continues)
      if (table === 'review_points') {
        return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
      }
      return Promise.resolve({ data: null, error: null });
    });
    chain.update = vi.fn((payload: Record<string, unknown>) => {
      updatePayload = payload;
      const capturedFilters = { ...filters };
      updateCalls.push({ table, payload, filters: capturedFilters });
      // Return a new chain so .eq() calls after update are also tracked
      const afterUpdate: Record<string, unknown> = {};
      afterUpdate.eq = vi.fn((col: string, val: string) => {
        capturedFilters[col] = val;
        updateCalls[updateCalls.length - 1].filters = { ...capturedFilters };
        return afterUpdate;
      });
      return afterUpdate;
    });
    chain.insert = vi.fn((payload: Record<string, unknown>) => {
      insertCalls.push({ table, payload });
      return Promise.resolve({ error: null });
    });

    return chain;
  };

  const mockFrom = vi.fn((table: string) => makeChain(table));

  // Store for module mocks to close over
  (globalThis as Record<string, unknown>).__pipelineMockFrom           = mockFrom;
  (globalThis as Record<string, unknown>).__mockAssertBriefReady       = mockAssertBriefReady;
  (globalThis as Record<string, unknown>).__mockAgentRun               = mockAgentRun;
  (globalThis as Record<string, unknown>).__mockAgentSaveDomainResult  = mockAgentSaveDomainResult;

  return {
    mockAssertBriefReady,
    mockAgentRun,
    mockAgentSaveDomainResult,
    getUpdateCalls,
    getInsertCalls,
    setProductMode,
    clearCalls,
  };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../services/supabase.js', () => ({
  supabase: { from: (globalThis as Record<string, unknown>).__pipelineMockFrom },
}));

vi.mock('../services/brief-validator.js', () => ({
  assertBriefReady: (globalThis as Record<string, unknown>).__mockAssertBriefReady,
  saveBriefResponses: vi.fn(),
  validateBriefResponses: vi.fn(),
}));

// Define the shared mock agent class inside vi.hoisted() so it is available
// when vi.mock() factories execute (which happens before module-level code).
vi.hoisted(() => {
  class MockAgent {
    run()              { return ((globalThis as Record<string, unknown>).__mockAgentRun as () => Promise<unknown>)(); }
    saveDomainResult(r: unknown) { return ((globalThis as Record<string, unknown>).__mockAgentSaveDomainResult as (r: unknown) => Promise<void>)(r); }
  }
  (globalThis as Record<string, unknown>).__MockAgent = MockAgent;
});

vi.mock('../agents/recon.js',      () => ({ ReconAgent:      (globalThis as Record<string, unknown>).__MockAgent }));
vi.mock('../agents/tech.js',       () => ({ TechAgent:       (globalThis as Record<string, unknown>).__MockAgent }));
vi.mock('../agents/security.js',   () => ({ SecurityAgent:   (globalThis as Record<string, unknown>).__MockAgent }));
vi.mock('../agents/seo.js',        () => ({ SeoAgent:        (globalThis as Record<string, unknown>).__MockAgent }));
vi.mock('../agents/ux.js',         () => ({ UxAgent:         (globalThis as Record<string, unknown>).__MockAgent }));
vi.mock('../agents/marketing.js',  () => ({ MarketingAgent:  (globalThis as Record<string, unknown>).__MockAgent }));
vi.mock('../agents/automation.js', () => ({ AutomationAgent: (globalThis as Record<string, unknown>).__MockAgent }));
vi.mock('../agents/strategy.js',   () => ({ StrategyAgent:   (globalThis as Record<string, unknown>).__MockAgent }));

vi.mock('../services/consistency-checker.js', () => ({
  consistencyChecker: { run: vi.fn().mockResolvedValue({ passed: true, flags: [] }) },
}));

// ─── Import under test ────────────────────────────────────────────────────────

import { PipelineOrchestrator } from '../services/pipeline.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAuditUpdates() {
  return getUpdateCalls().filter(c => c.table === 'audits');
}

function getDomainUpdates() {
  return getUpdateCalls().filter(c => c.table === 'audit_domains');
}

function getPipelineInserts() {
  return getInsertCalls().filter(c => c.table === 'pipeline_events');
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  clearCalls();
  setProductMode('full');
  (mockAssertBriefReady as Mock).mockReset().mockResolvedValue(undefined);
  (mockAgentRun as Mock).mockReset().mockResolvedValue({
    score: 3, label: 'Moderate', summary: '', strengths: [], weaknesses: [],
    issues: [], quick_wins: [], recommendations: [], unknown_items: [],
  });
  (mockAgentSaveDomainResult as Mock).mockReset().mockResolvedValue(undefined);
});

describe('PipelineOrchestrator.startPhase() — unknown phase', () => {
  it('throws for an unregistered phase number', async () => {
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await expect(orch.startPhase(99)).rejects.toThrow('Unknown phase');
  });
});

describe('PipelineOrchestrator.startPhase() — mode ceiling', () => {
  it('throws when phase exceeds express mode maximum (phase 5 on express)', async () => {
    setProductMode('express');
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await expect(orch.startPhase(5)).rejects.toThrow(/not available for product_mode 'express'/i);
  });

  it('does not throw for phase 4 on express mode (max allowed)', async () => {
    setProductMode('express');
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await expect(orch.startPhase(4)).resolves.not.toThrow();
  });

  it('throws when phase exceeds free_snapshot maximum (phase 5)', async () => {
    setProductMode('free_snapshot');
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await expect(orch.startPhase(5)).rejects.toThrow(/not available for product_mode 'free_snapshot'/i);
  });
});

describe('PipelineOrchestrator.startPhase(0) — Phase 0 (Recon) happy path', () => {
  it('calls assertBriefReady before running the agent', async () => {
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await orch.startPhase(0);
    expect(mockAssertBriefReady).toHaveBeenCalledWith(AUDIT_ID);
    expect(mockAssertBriefReady).toHaveBeenCalledBefore(mockAgentRun as Mock);
  });

  it('updates audit status to "recon" and current_phase to 0', async () => {
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await orch.startPhase(0);
    const statusUpdate = getAuditUpdates().find(u => u.payload.status === 'recon');
    expect(statusUpdate).toBeDefined();
    expect(statusUpdate?.payload.current_phase).toBe(0);
  });

  it('runs the agent (ReconAgent)', async () => {
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await orch.startPhase(0);
    expect(mockAgentRun).toHaveBeenCalledOnce();
  });

  it('does NOT call saveDomainResult for phase 0 (recon has no domain row)', async () => {
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await orch.startPhase(0);
    expect(mockAgentSaveDomainResult).not.toHaveBeenCalled();
  });

  it('emits "started" and "completed" pipeline events', async () => {
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await orch.startPhase(0);
    const events = getPipelineInserts().map(e => (e.payload as Record<string, unknown>).event_type);
    expect(events).toContain('started');
    expect(events).toContain('completed');
  });

  it('emits review_needed event after phase 0 (gate after Recon)', async () => {
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await orch.startPhase(0);
    const events = getPipelineInserts().map(e => (e.payload as Record<string, unknown>).event_type);
    expect(events).toContain('review_needed');
  });

  it('sets audit status to "review" after the review gate', async () => {
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await orch.startPhase(0);
    const reviewUpdate = getAuditUpdates().find(u => u.payload.status === 'review');
    expect(reviewUpdate).toBeDefined();
  });
});

describe('PipelineOrchestrator.startPhase(0) — brief gate failure', () => {
  it('marks audit as "failed" when assertBriefReady throws', async () => {
    (mockAssertBriefReady as Mock).mockRejectedValue(new Error('SLA not met: 3 required questions unanswered'));
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await expect(orch.startPhase(0)).rejects.toThrow('SLA not met');

    const failedUpdate = getAuditUpdates().find(u => u.payload.status === 'failed');
    expect(failedUpdate).toBeDefined();
  });

  it('emits an error event when brief gate fails', async () => {
    (mockAssertBriefReady as Mock).mockRejectedValue(new Error('SLA not met'));
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await expect(orch.startPhase(0)).rejects.toThrow();

    const errorEvent = getPipelineInserts().find(
      e => (e.payload as Record<string, unknown>).event_type === 'error'
    );
    expect(errorEvent).toBeDefined();
  });

  it('does NOT call agent.run() when brief gate fails', async () => {
    (mockAssertBriefReady as Mock).mockRejectedValue(new Error('SLA not met'));
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await expect(orch.startPhase(0)).rejects.toThrow();
    expect(mockAgentRun).not.toHaveBeenCalled();
  });
});

describe('PipelineOrchestrator.startPhase(1) — domain phase happy path', () => {
  it('sets domain status to "collecting" before agent runs', async () => {
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await orch.startPhase(1);
    const collectingUpdate = getDomainUpdates().find(u => u.payload.status === 'collecting');
    expect(collectingUpdate).toBeDefined();
  });

  it('calls agent.run()', async () => {
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await orch.startPhase(1);
    expect(mockAgentRun).toHaveBeenCalledOnce();
  });

  it('calls saveDomainResult with agent output', async () => {
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await orch.startPhase(1);
    expect(mockAgentSaveDomainResult).toHaveBeenCalledOnce();
  });

  it('does NOT call assertBriefReady (only phase 0 has brief gate)', async () => {
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await orch.startPhase(1);
    expect(mockAssertBriefReady).not.toHaveBeenCalled();
  });

  it('updates audit status to "auto" and current_phase to 1', async () => {
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await orch.startPhase(1);
    const statusUpdate = getAuditUpdates().find(u => u.payload.status === 'auto');
    expect(statusUpdate?.payload.current_phase).toBe(1);
  });
});

describe('PipelineOrchestrator.startPhase(1) — agent failure', () => {
  it('marks domain as "failed" when agent.run() throws', async () => {
    (mockAgentRun as Mock).mockRejectedValue(new Error('LLM timeout'));
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await expect(orch.startPhase(1)).rejects.toThrow('LLM timeout');

    const failedDomain = getDomainUpdates().find(u => u.payload.status === 'failed');
    expect(failedDomain).toBeDefined();
  });

  it('marks audit as "failed" when agent.run() throws', async () => {
    (mockAgentRun as Mock).mockRejectedValue(new Error('LLM timeout'));
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await expect(orch.startPhase(1)).rejects.toThrow();

    const failedAudit = getAuditUpdates().find(u => u.payload.status === 'failed');
    expect(failedAudit).toBeDefined();
  });

  it('emits an error event when agent.run() throws', async () => {
    (mockAgentRun as Mock).mockRejectedValue(new Error('LLM timeout'));
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await expect(orch.startPhase(1)).rejects.toThrow();

    const errorEvent = getPipelineInserts().find(
      e => (e.payload as Record<string, unknown>).event_type === 'error'
    );
    expect(errorEvent).toBeDefined();
  });

  it('rethrows the original error (caller receives it)', async () => {
    const original = new Error('Specific agent error message');
    (mockAgentRun as Mock).mockRejectedValue(original);
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await expect(orch.startPhase(1)).rejects.toBe(original);
  });
});

describe('PipelineOrchestrator.startPhase(7) — Strategy phase', () => {
  it('does NOT update domain status (strategy has no domain row)', async () => {
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await orch.startPhase(7);
    expect(getDomainUpdates()).toHaveLength(0);
  });

  it('does NOT call saveDomainResult', async () => {
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await orch.startPhase(7);
    expect(mockAgentSaveDomainResult).not.toHaveBeenCalled();
  });

  it('runs the agent', async () => {
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await orch.startPhase(7);
    expect(mockAgentRun).toHaveBeenCalledOnce();
  });

  it('emits review_needed after phase 7 (final gate, full mode)', async () => {
    const orch = new PipelineOrchestrator(AUDIT_ID);
    await orch.startPhase(7);
    const events = getPipelineInserts().map(e => (e.payload as Record<string, unknown>).event_type);
    expect(events).toContain('review_needed');
  });
});
