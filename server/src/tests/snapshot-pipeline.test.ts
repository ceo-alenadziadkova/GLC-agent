/**
 * Smoke tests: PipelineOrchestrator.runFreeSnapshot()
 *
 * Tests the Free Snapshot pipeline path:
 *  - Phase 0 (Recon) + Phase 4 (UX) run sequentially
 *  - Result is trimmed to max 2 issues and 2 quick wins
 *  - Audit status set to 'completed' on success, 'failed' on error
 *  - Returned preview contains company info + UX score + trimmed findings
 *
 * All external dependencies (supabase, agents) are mocked.
 * No real DB or LLM calls are made.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockFrom, setAuditData, setReconData, setUxDomainData, getUpdateCalls, getInsertCalls, mockRunRecon, mockRunUx, mockSaveDomainResult } = vi.hoisted(() => {
  // Tracking arrays for verification
  const updateCalls: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const insertCalls: Array<{ table: string; payload: Record<string, unknown> }> = [];

  // Preset return data per table
  let auditData: Record<string, unknown> = {
    snapshot_token: 'test-token-uuid',
    company_url: 'https://example.com',
    company_name: 'Example Co',
  };
  let reconData: Record<string, unknown> = {
    company_name: 'Example Co',
    tech_stack: { cms: ['WordPress'], analytics: ['Google Analytics'] },
    location: 'Berlin, Germany',
  };
  let uxDomainData: Record<string, unknown> | null = null; // Unused in pipeline path — ux comes from agent.run()

  const setAuditData = (d: Record<string, unknown>) => { auditData = d; };
  const setReconData = (d: Record<string, unknown>) => { reconData = d; };
  const setUxDomainData = (d: Record<string, unknown> | null) => { uxDomainData = d; };
  const getUpdateCalls = () => updateCalls;
  const getInsertCalls = () => insertCalls;

  // Agent run mocks
  const mockRunRecon = vi.fn().mockResolvedValue(undefined);
  const mockRunUx = vi.fn();
  const mockSaveDomainResult = vi.fn().mockResolvedValue(undefined);

  // Chainable supabase mock factory
  const makeChain = (table: string) => ({
    update: vi.fn((payload: Record<string, unknown>) => {
      updateCalls.push({ table, payload });
      return {
        eq: vi.fn().mockReturnThis(),
      };
    }),
    insert: vi.fn((payload: Record<string, unknown>) => {
      insertCalls.push({ table, payload });
      return Promise.resolve({ error: null });
    }),
    select: vi.fn(() => ({
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(() => {
        if (table === 'audits') return Promise.resolve({ data: auditData, error: null });
        if (table === 'audit_recon') return Promise.resolve({ data: reconData, error: null });
        if (table === 'audit_domains') return Promise.resolve({ data: uxDomainData, error: null });
        return Promise.resolve({ data: null, error: null });
      }),
    })),
  });

  const mockFrom = vi.fn((table: string) => makeChain(table));

  // Store references for module mock to close over
  (globalThis as Record<string, unknown>).__mockFrom = mockFrom;
  (globalThis as Record<string, unknown>).__mockRunRecon = mockRunRecon;
  (globalThis as Record<string, unknown>).__mockRunUx = mockRunUx;
  (globalThis as Record<string, unknown>).__mockSaveDomain = mockSaveDomainResult;

  return { mockFrom, setAuditData, setReconData, setUxDomainData, getUpdateCalls, getInsertCalls, mockRunRecon, mockRunUx, mockSaveDomainResult };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../services/supabase.js', () => ({
  supabase: { from: (globalThis as Record<string, unknown>).__mockFrom },
}));

vi.mock('../agents/recon.js', () => ({
  ReconAgent: class MockReconAgent {
    constructor(public auditId: string) {}
    async run() {
      return (globalThis as Record<string, unknown>).__mockRunRecon(this.auditId);
    }
  },
}));

vi.mock('../agents/ux.js', () => ({
  UxAgent: class MockUxAgent {
    constructor(public auditId: string) {}
    async run() {
      return (globalThis as Record<string, unknown>).__mockRunUx(this.auditId);
    }
    async saveDomainResult(result: unknown) {
      return (globalThis as Record<string, unknown>).__mockSaveDomain(result);
    }
  },
}));

// Other agents mocked to prevent import errors
vi.mock('../agents/tech.js',       () => ({ TechAgent: class {} }));
vi.mock('../agents/security.js',   () => ({ SecurityAgent: class {} }));
vi.mock('../agents/seo.js',        () => ({ SeoAgent: class {} }));
vi.mock('../agents/marketing.js',  () => ({ MarketingAgent: class {} }));
vi.mock('../agents/automation.js', () => ({ AutomationAgent: class {} }));
vi.mock('../agents/strategy.js',   () => ({ StrategyAgent: class {} }));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { PipelineOrchestrator } from '../services/pipeline.js';
import type { DomainResult, AuditIssue, QuickWin } from '../types/audit.js';

// ─── Test data helpers ────────────────────────────────────────────────────────

const AUDIT_ID = 'audit-snapshot-uuid-001';

function makeIssue(n: number): AuditIssue {
  return { id: `i${n}`, severity: 'high', title: `Issue ${n}`, description: `Desc ${n}`, impact: 'High' };
}

function makeQuickWin(n: number): QuickWin {
  return { id: `q${n}`, title: `Quick win ${n}`, description: `Do thing ${n}`, effort: 'low', timeframe: '1 day' };
}

function makeUxResult(issueCount = 3, quickWinCount = 4): DomainResult {
  return {
    score: 3,
    label: 'Moderate',
    summary: 'Several UX issues detected across the website conversion funnel.',
    strengths: ['Mobile responsive'],
    weaknesses: ['Slow CTA', 'No trust signals'],
    issues: Array.from({ length: issueCount }, (_, i) => makeIssue(i + 1)),
    quick_wins: Array.from({ length: quickWinCount }, (_, i) => makeQuickWin(i + 1)),
    recommendations: [],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PipelineOrchestrator.runFreeSnapshot()', () => {
  beforeEach(() => {
    // vi.resetAllMocks() resets both history AND implementation (unlike clearAllMocks)
    // This prevents mock state leaking between tests when e.g. mockRejectedValue is set.
    vi.resetAllMocks();
    getUpdateCalls().length = 0;
    getInsertCalls().length = 0;

    // Re-apply default implementations after reset
    mockRunRecon.mockResolvedValue(undefined);
    mockRunUx.mockResolvedValue(makeUxResult());
    mockSaveDomainResult.mockResolvedValue(undefined);

    // Reset default data
    setAuditData({
      snapshot_token: 'test-token-uuid',
      company_url: 'https://example.com',
      company_name: null,
    });
    setReconData({
      company_name: 'Example Co',
      tech_stack: { cms: ['WordPress'], analytics: ['Google Analytics'] },
      location: 'Berlin, Germany',
    });
  });

  // ── Success path ──────────────────────────────────────────

  it('runs ReconAgent and UxAgent in sequence', async () => {
    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    await orchestrator.runFreeSnapshot();

    expect(mockRunRecon).toHaveBeenCalledOnce();
    expect(mockRunUx).toHaveBeenCalledOnce();
  });

  it('calls saveDomainResult on the UX result', async () => {
    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    await orchestrator.runFreeSnapshot();

    expect(mockSaveDomainResult).toHaveBeenCalledOnce();
    const savedResult = (mockSaveDomainResult as Mock).mock.calls[0][0] as DomainResult;
    expect(savedResult.score).toBe(3);
  });

  it('sets audit status to "completed" on success', async () => {
    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    await orchestrator.runFreeSnapshot();

    const completedUpdate = getUpdateCalls().find(
      c => c.table === 'audits' && c.payload.status === 'completed'
    );
    expect(completedUpdate).toBeDefined();
  });

  it('sets audit status to "recon" then "auto" before each phase', async () => {
    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    await orchestrator.runFreeSnapshot();

    const auditUpdates = getUpdateCalls().filter(c => c.table === 'audits');
    const statuses = auditUpdates.map(c => c.payload.status).filter(Boolean);

    expect(statuses).toContain('recon');
    expect(statuses).toContain('auto');
    expect(statuses).toContain('completed');
  });

  it('marks ux_conversion domain as "collecting" before UX phase', async () => {
    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    await orchestrator.runFreeSnapshot();

    const domainUpdate = getUpdateCalls().find(
      c => c.table === 'audit_domains' && c.payload.status === 'collecting'
    );
    expect(domainUpdate).toBeDefined();
  });

  // ── Result trimming ───────────────────────────────────────

  it('trims issues to max 2 even when agent returns more', async () => {
    mockRunUx.mockResolvedValue(makeUxResult(5, 5)); // 5 issues, 5 quick wins

    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    const preview = await orchestrator.runFreeSnapshot();

    expect(preview.issues).toHaveLength(2);
    expect(preview.issues[0].title).toBe('Issue 1');
    expect(preview.issues[1].title).toBe('Issue 2');
  });

  it('trims quick_wins to max 2 even when agent returns more', async () => {
    mockRunUx.mockResolvedValue(makeUxResult(5, 5));

    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    const preview = await orchestrator.runFreeSnapshot();

    expect(preview.quick_wins).toHaveLength(2);
    expect(preview.quick_wins[0].title).toBe('Quick win 1');
  });

  it('handles agent returning exactly 2 issues without truncation', async () => {
    mockRunUx.mockResolvedValue(makeUxResult(2, 1));

    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    const preview = await orchestrator.runFreeSnapshot();

    expect(preview.issues).toHaveLength(2);
    expect(preview.quick_wins).toHaveLength(1);
  });

  it('handles agent returning 0 issues and 0 quick wins gracefully', async () => {
    mockRunUx.mockResolvedValue(makeUxResult(0, 0));

    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    const preview = await orchestrator.runFreeSnapshot();

    expect(preview.issues).toHaveLength(0);
    expect(preview.quick_wins).toHaveLength(0);
    expect(preview.ux_score).toBe(3);
  });

  // ── Returned preview shape ────────────────────────────────

  it('returns correct preview structure with company info from recon', async () => {
    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    const preview = await orchestrator.runFreeSnapshot();

    expect(preview.audit_id).toBe(AUDIT_ID);
    expect(preview.status).toBe('completed');
    expect(preview.company_name).toBe('Example Co');
    expect(preview.location).toBe('Berlin, Germany');
    expect(preview.tech_stack).toEqual({ cms: ['WordPress'], analytics: ['Google Analytics'] });
    expect(preview.ux_score).toBe(3);
    expect(preview.ux_label).toBe('Moderate');
    expect(typeof preview.ux_summary).toBe('string');
  });

  it('falls back to audit company_name when recon has no company_name', async () => {
    setReconData({ company_name: null, tech_stack: {}, location: null });
    setAuditData({
      snapshot_token: 'test-token-uuid',
      company_url: 'https://example.com',
      company_name: 'Fallback Name',
    });

    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    const preview = await orchestrator.runFreeSnapshot();

    expect(preview.company_name).toBe('Fallback Name');
  });

  it('snapshot_token is passed through from audit record', async () => {
    setAuditData({
      snapshot_token: 'my-specific-token-abc123',
      company_url: 'https://test.com',
      company_name: null,
    });

    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    const preview = await orchestrator.runFreeSnapshot();

    expect(preview.snapshot_token).toBe('my-specific-token-abc123');
  });

  // ── Error handling ────────────────────────────────────────

  it('sets audit status to "failed" when ReconAgent throws', async () => {
    mockRunRecon.mockRejectedValue(new Error('Recon crawl failed: timeout'));

    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    await expect(orchestrator.runFreeSnapshot()).rejects.toThrow('Recon crawl failed: timeout');

    const failedUpdate = getUpdateCalls().find(
      c => c.table === 'audits' && c.payload.status === 'failed'
    );
    expect(failedUpdate).toBeDefined();
  });

  it('sets audit status to "failed" when UxAgent throws', async () => {
    mockRunUx.mockRejectedValue(new Error('UX agent: Claude API error'));

    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    await expect(orchestrator.runFreeSnapshot()).rejects.toThrow('UX agent: Claude API error');

    const failedUpdate = getUpdateCalls().find(
      c => c.table === 'audits' && c.payload.status === 'failed'
    );
    expect(failedUpdate).toBeDefined();
  });

  it('does NOT set status="completed" when an error occurs', async () => {
    mockRunUx.mockRejectedValue(new Error('fail'));

    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    await expect(orchestrator.runFreeSnapshot()).rejects.toThrow();

    const completedUpdate = getUpdateCalls().find(
      c => c.table === 'audits' && c.payload.status === 'completed'
    );
    expect(completedUpdate).toBeUndefined();
  });

  it('emits an error pipeline_event on failure', async () => {
    mockRunRecon.mockRejectedValue(new Error('timeout'));

    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    await expect(orchestrator.runFreeSnapshot()).rejects.toThrow();

    const errorEvent = getInsertCalls().find(
      c => c.table === 'pipeline_events' &&
           (c.payload as Record<string, unknown>).event_type === 'error'
    );
    expect(errorEvent).toBeDefined();
  });
});
