import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'token-123' } } }),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
    },
  },
}));

import { api } from '../apiService';

function mockJsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => payload,
  } as Response;
}

describe('apiService intake contract guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getBrief accepts payload with gates + intakeProgress', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse({
      brief: null,
      questions: [],
      validation: {
        passed: true,
        sla_met: true,
        answered_required: 7,
        total_required: 7,
        answered_recommended: 3,
        total_recommended: 10,
        missing_required: [],
      },
      gates: {
        canStartSnapshot: true,
        canStartExpress: true,
        canStartFull: true,
        missingRequiredIds: [],
        recommendedToImproveIds: [],
        intakeProgress: { progressPct: 78, readinessBadge: 'medium', nextBestAction: 'add_recommended' },
      },
      intakeProgress: { progressPct: 78, readinessBadge: 'medium', nextBestAction: 'add_recommended' },
    })));

    const data = await api.getBrief('audit-001');
    expect(data.gates.canStartExpress).toBe(true);
    expect(data.intakeProgress.progressPct).toBe(78);
  });

  it('saveBrief throws on broken payload shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse({
      brief: { id: 'b1' },
      validation: { passed: true, sla_met: true, answered_required: 7, total_required: 7 },
      // missing gates + intakeProgress
    })));

    await expect(api.saveBrief('audit-001', { primary_goal: 'grow' }))
      .rejects
      .toThrow(/Invalid API payload/);
  });

  it('startPipeline accepts payload with intakeProgress', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse({
      status: 'started',
      phase: 0,
      intakeProgress: { progressPct: 66, readinessBadge: 'medium', nextBestAction: 'add_recommended' },
    })));

    const data = await api.startPipeline('audit-001');
    expect(data.status).toBe('started');
    expect(data.intakeProgress.progressPct).toBe(66);
  });

  it('startPipeline throws when intakeProgress is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse({
      status: 'started',
      phase: 0,
    })));

    await expect(api.startPipeline('audit-001'))
      .rejects
      .toThrow(/Invalid API payload/);
  });
});

function validPipelineStatusPayload(auditId: string) {
  return {
    status: 'review',
    current_phase: 0,
    tokens_used: 100,
    token_budget: 1000,
    product_mode: 'full',
    events: [
      {
        id: 1,
        audit_id: auditId,
        phase: 0,
        event_type: 'completed',
        message: 'ok',
        data: { trace_id: 't1' },
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    reviews: [
      {
        after_phase: 0,
        status: 'pending',
        consultant_notes: null,
        interview_notes: null,
      },
    ],
  };
}

describe('apiService pipeline status contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getPipelineStatus accepts a valid payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(validPipelineStatusPayload('audit-001'))));

    const data = await api.getPipelineStatus('audit-001');
    expect(data.status).toBe('review');
    expect(data.events).toHaveLength(1);
    expect(data.events[0].message).toBe('ok');
    expect(data.reviews[0].after_phase).toBe(0);
  });

  it('getPipelineStatus accepts null message on events', async () => {
    const body = validPipelineStatusPayload('audit-001');
    body.events[0].message = null;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(body)));

    const data = await api.getPipelineStatus('audit-001');
    expect(data.events[0].message).toBeNull();
  });

  it('getPipelineStatus throws when product_mode is missing', async () => {
    const body = validPipelineStatusPayload('audit-001') as Record<string, unknown>;
    delete body.product_mode;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(body)));

    await expect(api.getPipelineStatus('audit-001')).rejects.toThrow(/product_mode/);
  });

  it('getPipelineStatus throws when events is not an array', async () => {
    const body = { ...validPipelineStatusPayload('audit-001'), events: {} };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(body)));

    await expect(api.getPipelineStatus('audit-001')).rejects.toThrow(/events must be an array/);
  });

  it('getPipelineStatus throws when an event is missing audit_id', async () => {
    const body = validPipelineStatusPayload('audit-001');
    const ev = { ...body.events[0] } as Record<string, unknown>;
    delete ev.audit_id;
    body.events = [ev] as typeof body.events;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse(body)));

    await expect(api.getPipelineStatus('audit-001')).rejects.toThrow(/audit_id/);
  });

  it('runNextPhase validates status and phase', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse({ status: 'running', phase: 2 })));

    const data = await api.runNextPhase('audit-001');
    expect(data.phase).toBe(2);
  });

  it('runNextPhase throws on incomplete payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse({ status: 'running' })));

    await expect(api.runNextPhase('audit-001')).rejects.toThrow(/pipeline next/);
  });

  it('retryPhase validates status and phase', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse({ status: 'retrying', phase: 1 })));

    const data = await api.retryPhase('audit-001', 1);
    expect(data.status).toBe('retrying');
  });

  it('retryPhase throws on incomplete payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJsonResponse({ phase: 1 })));

    await expect(api.retryPhase('audit-001', 1)).rejects.toThrow(/pipeline retry/);
  });
});

