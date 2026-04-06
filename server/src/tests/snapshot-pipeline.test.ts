/**
 * PipelineOrchestrator.runFreeSnapshot() — deterministic snapshot path (no Recon/Ux agents).
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

const mockRunDeterministic = vi.fn();

vi.mock('../snapshot/run-snapshot.js', () => ({
  runDeterministicSnapshot: (...args: unknown[]) => mockRunDeterministic(...args),
}));

const { mockFrom, getUpdateCalls, getInsertCalls } = vi.hoisted(() => {
  const updateCalls: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const insertCalls: Array<{ table: string; payload: Record<string, unknown> }> = [];

  let auditData: Record<string, unknown> = {
    snapshot_token: 'test-token-uuid',
    company_url: 'https://example.com',
    company_name: null,
  };

  const makeChain = (table: string) => ({
    update: vi.fn((payload: Record<string, unknown>) => {
      updateCalls.push({ table, payload });
      return { eq: vi.fn().mockReturnThis() };
    }),
    insert: vi.fn((payload: Record<string, unknown>) => {
      insertCalls.push({ table, payload });
      return Promise.resolve({ error: null });
    }),
    select: vi.fn(() => ({
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: auditData, error: null })),
    })),
    delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
  });

  const mockFrom = vi.fn((table: string) => makeChain(table));

  (globalThis as Record<string, unknown>).__snapMockFrom = mockFrom;

  return {
    mockFrom,
    getUpdateCalls: () => updateCalls,
    getInsertCalls: () => insertCalls,
  };
});

vi.mock('../services/supabase.js', () => ({
  supabase: { from: (globalThis as Record<string, unknown>).__snapMockFrom },
}));

vi.mock('../services/notifications.js', () => ({
  notifyAuditParticipants: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/observability-context.js', () => ({
  getContext: () => ({}),
  updateContext: vi.fn(),
}));

import { PipelineOrchestrator } from '../services/pipeline.js';
import type { FreeSnapshotPreview } from '../types/audit.js';

const AUDIT_ID = 'audit-snapshot-uuid-001';

function makePreview(over: Partial<FreeSnapshotPreview> = {}): FreeSnapshotPreview {
  return {
    audit_id: AUDIT_ID,
    snapshot_token: 'test-token-uuid',
    status: 'completed',
    company_url: 'https://example.com',
    company_name: 'Example Co',
    tech_stack: { cms: ['WordPress'] },
    location: 'Berlin',
    ux_score: 3,
    ux_label: 'Moderate',
    ux_summary: 'Snapshot score 55/100 (medium confidence scan). Profile: service business.',
    issues: [
      {
        id: 'snapshot-UX02',
        severity: 'high',
        title: 'Issue',
        description: 'Desc',
        impact: 'Med',
        confidence: 'medium',
        evidence_refs: [{ type: 'snapshot_rule', finding: 'x' }],
        data_source: 'auto_detected',
      },
      {
        id: 'snapshot-UX03',
        severity: 'high',
        title: 'Issue2',
        description: 'Desc2',
        impact: 'Med',
        confidence: 'medium',
        evidence_refs: [{ type: 'snapshot_rule', finding: 'y' }],
        data_source: 'auto_detected',
      },
    ],
    quick_wins: [
      { id: 'q1', title: 'QW1', description: 'd', effort: 'low', timeframe: '1d' },
      { id: 'q2', title: 'QW2', description: 'd', effort: 'low', timeframe: '1d' },
    ],
    overall_score: 55,
    ...over,
  };
}

describe('PipelineOrchestrator.runFreeSnapshot() deterministic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUpdateCalls().length = 0;
    getInsertCalls().length = 0;
    mockRunDeterministic.mockResolvedValue({ preview: makePreview() });
  });

  it('calls runDeterministicSnapshot once', async () => {
    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    await orchestrator.runFreeSnapshot();
    expect(mockRunDeterministic).toHaveBeenCalledOnce();
    expect(mockRunDeterministic).toHaveBeenCalledWith(AUDIT_ID);
  });

  it('returns preview from runDeterministicSnapshot', async () => {
    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    const preview = await orchestrator.runFreeSnapshot();
    expect(preview.company_name).toBe('Example Co');
    expect(preview.overall_score).toBe(55);
    expect(preview.issues).toHaveLength(2);
  });

  it('sets audit status to recon then emits; completion is handled inside deterministic runner', async () => {
    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    await orchestrator.runFreeSnapshot();

    const auditUpdates = getUpdateCalls().filter(c => c.table === 'audits');
    const reconUpdate = auditUpdates.find(c => c.payload.status === 'recon');
    expect(reconUpdate).toBeDefined();
  });

  it('sets audit status to failed when deterministic runner throws', async () => {
    mockRunDeterministic.mockRejectedValueOnce(new Error('fetch failed'));
    const orchestrator = new PipelineOrchestrator(AUDIT_ID);
    await expect(orchestrator.runFreeSnapshot()).rejects.toThrow('fetch failed');

    const failedUpdate = getUpdateCalls().find(
      c => c.table === 'audits' && c.payload.status === 'failed',
    );
    expect(failedUpdate).toBeDefined();
  });
});
