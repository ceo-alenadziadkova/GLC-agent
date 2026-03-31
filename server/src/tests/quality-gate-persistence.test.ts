/**
 * Tests: quality_gate_passed written to review_points after runBlock()
 *
 * Verifies that after PipelineOrchestrator.runBlock() runs the auto wing
 * (phases 1-4), the consistency-checker result is persisted to review_points
 * via an UPDATE WHERE after_phase = lastWingPhase.
 *
 * Supabase mock design:
 *  - update(payload) records the call immediately to updateCalls[]
 *  - subsequent .eq() calls mutate the same record's filters in-place
 *  - the chain is thenable so await resolves cleanly
 *
 * All external deps (supabase, agents, brief-validator, consistencyChecker) are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const AUDIT_ID = 'qg-test-audit-001';

// ─── Hoisted mocks ─────────────────────────────────────────────────────────

const {
  updateCalls,
  clearCalls,
  setConsistencyResult,
  setAuditData,
} = vi.hoisted(() => {
  type UpdateCall = { table: string; payload: Record<string, unknown>; filters: Record<string, unknown> };
  const updateCalls: UpdateCall[] = [];
  const clearCalls = () => { updateCalls.length = 0; };

  let consistencyPassed = true;
  const setConsistencyResult = (passed: boolean) => { consistencyPassed = passed; };

  let auditData: Record<string, unknown> = { current_phase: 0, status: 'review', product_mode: 'full' };
  const setAuditData = (v: typeof auditData) => { auditData = v; };

  (globalThis as Record<string, unknown>).__qgUpdateCalls = updateCalls;
  (globalThis as Record<string, unknown>).__qgGetConsistencyPassed = () => consistencyPassed;
  (globalThis as Record<string, unknown>).__qgGetAuditData = () => auditData;

  return { updateCalls, clearCalls, setConsistencyResult, setAuditData };
});

// ─── Module mocks ───────────────────────────────────────────────────────────

vi.mock('../services/supabase.js', () => {
  const calls = (globalThis as Record<string, unknown>).__qgUpdateCalls as Array<{
    table: string; payload: Record<string, unknown>; filters: Record<string, unknown>;
  }>;
  const getAuditData = (globalThis as Record<string, unknown>).__qgGetAuditData as () => Record<string, unknown>;

  const makeChain = (table: string) => {
    // Shared filter bag for the whole chain (both select and update .eq() calls go here)
    const filters: Record<string, unknown> = {};

    // Build a thenable+chainable object for the update path.
    // Calling update() immediately records the call; subsequent .eq() mutate filters in-place.
    const buildUpdateChain = (callRecord: { table: string; payload: Record<string, unknown>; filters: Record<string, unknown> }) => {
      const obj: Record<string, unknown> = {
        then: undefined as unknown,
      };
      // Make it thenable so `await` resolves immediately
      obj.then = (resolve: (v: unknown) => void) => resolve({ data: null, error: null });
      obj.eq = vi.fn((col: string, val: unknown) => {
        callRecord.filters[col] = val;
        return obj; // return same thenable so chained .eq() also captures filters
      });
      return obj;
    };

    const chain: Record<string, unknown> = {
      eq: vi.fn((col: string, val: unknown) => { filters[col] = val; return chain; }),
      select: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      single: vi.fn(() => Promise.resolve({ data: getAuditData(), error: null })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn((payload: Record<string, unknown>) => {
        // Record immediately with a mutable filters object
        const callRecord = { table, payload: { ...payload }, filters: {} as Record<string, unknown> };
        calls.push(callRecord);
        return buildUpdateChain(callRecord);
      }),
    };
    return chain;
  };

  return {
    supabase: {
      from: vi.fn((table: string) => makeChain(table)),
    },
  };
});

vi.mock('../services/consistency-checker.js', () => {
  const getPassed = (globalThis as Record<string, unknown>).__qgGetConsistencyPassed as () => boolean;
  return {
    consistencyChecker: {
      run: vi.fn(async (_auditId: string, gatePhase: number, checkedPhases: number[]) => ({
        passed: getPassed(),
        flags: getPassed() ? [] : [{ severity: 'warning', rule: 'test', message: 'discrepancy' }],
        message: getPassed() ? 'Quality gate passed' : 'Quality gate failed',
        audit_id: _auditId,
        gate_phase: gatePhase,
        checked_phases: checkedPhases,
      })),
    },
  };
});

vi.mock('../services/brief-validator.js', () => ({
  assertBriefReady: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../services/observability-context.js', () => ({
  getContext: vi.fn(() => ({ traceId: 'test-trace', operationId: 'test-op' })),
  updateContext: vi.fn(),
}));

// Mock all 8 agent classes
const mockAgentRun = vi.fn().mockResolvedValue({
  score: 3, label: 'Moderate', summary: 'Test', strengths: [], weaknesses: [],
  issues: [], quick_wins: [], recommendations: [], unknown_items: [],
});
const mockAgentSave = vi.fn().mockResolvedValue(undefined);

vi.mock('../agents/recon.js',      () => ({ ReconAgent:      class { run = mockAgentRun; saveDomainResult = mockAgentSave; } }));
vi.mock('../agents/tech.js',       () => ({ TechAgent:       class { run = mockAgentRun; saveDomainResult = mockAgentSave; } }));
vi.mock('../agents/security.js',   () => ({ SecurityAgent:   class { run = mockAgentRun; saveDomainResult = mockAgentSave; } }));
vi.mock('../agents/seo.js',        () => ({ SeoAgent:        class { run = mockAgentRun; saveDomainResult = mockAgentSave; } }));
vi.mock('../agents/ux.js',         () => ({ UxAgent:         class { run = mockAgentRun; saveDomainResult = mockAgentSave; } }));
vi.mock('../agents/marketing.js',  () => ({ MarketingAgent:  class { run = mockAgentRun; saveDomainResult = mockAgentSave; } }));
vi.mock('../agents/automation.js', () => ({ AutomationAgent: class { run = mockAgentRun; saveDomainResult = mockAgentSave; } }));
vi.mock('../agents/strategy.js',   () => ({ StrategyAgent:   class { run = mockAgentRun; saveDomainResult = mockAgentSave; } }));

// ─── Import after mocks ─────────────────────────────────────────────────────

import { PipelineOrchestrator } from '../services/pipeline.js';
import { consistencyChecker } from '../services/consistency-checker.js';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('quality_gate_passed persisted to review_points after auto wing', () => {
  beforeEach(() => {
    clearCalls();
    vi.clearAllMocks();
    mockAgentRun.mockResolvedValue({
      score: 3, label: 'Moderate', summary: 'Test', strengths: [], weaknesses: [],
      issues: [], quick_wins: [], recommendations: [], unknown_items: [],
    });
    mockAgentSave.mockResolvedValue(undefined);
    // audit at current_phase=0 → runBlock() will trigger auto wing (phases 1-4)
    setAuditData({ current_phase: 0, status: 'review', product_mode: 'full' });
    setConsistencyResult(true);
  });

  it('calls consistencyChecker.run() with correct auditId and wing phases', async () => {
    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    await orchestrator.runBlock();
    expect(consistencyChecker.run).toHaveBeenCalledWith(AUDIT_ID, 4, [1, 2, 3, 4]);
  });

  it('writes quality_gate_passed=true when consistency check passes', async () => {
    setConsistencyResult(true);
    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    await orchestrator.runBlock();

    const hit = updateCalls.find(c => c.table === 'review_points' && 'quality_gate_passed' in c.payload);
    expect(hit).toBeDefined();
    expect(hit!.payload.quality_gate_passed).toBe(true);
    expect(hit!.filters.audit_id).toBe(AUDIT_ID);
    expect(hit!.filters.after_phase).toBe(4);
  });

  it('writes quality_gate_passed=false when consistency check fails', async () => {
    setConsistencyResult(false);
    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    await orchestrator.runBlock();

    const hit = updateCalls.find(c => c.table === 'review_points' && 'quality_gate_passed' in c.payload);
    expect(hit).toBeDefined();
    expect(hit!.payload.quality_gate_passed).toBe(false);
  });
});
