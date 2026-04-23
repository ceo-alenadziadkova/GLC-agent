import { beforeEach, describe, expect, it, vi } from 'vitest';

const pilotMocks = vi.hoisted(() => ({ diagnosticIntakePilot: false }));
const fetchTokenMocks = vi.hoisted(() => ({ fetchIntakeTokenRowForRespond: vi.fn() }));
const insertMocks = vi.hoisted(() => ({ insert: vi.fn() }));

vi.mock('../config/feature-flags.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../config/feature-flags.js')>();
  return {
    ...actual,
    isDiagnosticIntakePilotEnabled: () => pilotMocks.diagnosticIntakePilot,
  };
});

vi.mock('../services/intake/intake-token.service.js', () => ({
  fetchIntakeTokenRowForRespond: fetchTokenMocks.fetchIntakeTokenRowForRespond,
}));

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: insertMocks.insert,
    })),
  },
}));

vi.mock('../services/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { PIPELINE_EVENT_TYPES } from '../config/pipeline-event-types.js';
import { postIntakeIntelligenceKpiController } from '../routes/intake/controllers/post-intake-intelligence-kpi.controller.js';

const VALID_TOKEN = `${'a'.repeat(40)}`;

function createMockRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { status, json, res: { status } as unknown as import('express').Response };
}

describe('postIntakeIntelligenceKpiController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pilotMocks.diagnosticIntakePilot = true;
    insertMocks.insert.mockReturnValue(Promise.resolve({ error: null }));
    const future = new Date(Date.now() + 86_400_000).toISOString();
    fetchTokenMocks.fetchIntakeTokenRowForRespond.mockResolvedValue({
      id: 'token-row-kpi-1',
      consultant_id: 'consultant-1',
      audit_id: 'audit-kpi-1',
      expires_at: future,
      responses: {},
    });
  });

  it('returns 404 when diagnostic intake pilot is disabled', async () => {
    pilotMocks.diagnosticIntakePilot = false;
    const { status, res } = createMockRes();
    await postIntakeIntelligenceKpiController(
      { params: { token: VALID_TOKEN }, body: { event: 'question_shown', question_id: 'f1' } } as unknown as import('express').Request,
      res,
    );
    expect(status).toHaveBeenCalledWith(404);
  });

  it('returns 400 when question_shown is missing question_id', async () => {
    const { status, res } = createMockRes();
    await postIntakeIntelligenceKpiController(
      { params: { token: VALID_TOKEN }, body: { event: 'question_shown' } } as unknown as import('express').Request,
      res,
    );
    expect(status).toHaveBeenCalledWith(400);
  });

  it('inserts pipeline_events for question_shown when audit is linked', async () => {
    const { status, json, res } = createMockRes();
    await postIntakeIntelligenceKpiController(
      {
        params: { token: VALID_TOKEN },
        body: { event: 'question_shown', question_id: 'f1', client_session_id: 'sess-1' },
      } as unknown as import('express').Request,
      res,
    );
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ ok: true, persisted: true });
    expect(insertMocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        audit_id: 'audit-kpi-1',
        event_type: PIPELINE_EVENT_TYPES.intakeIntelligenceQuestionShown,
        data: expect.objectContaining({
          question_id: 'f1',
          client_session_id: 'sess-1',
        }),
      }),
    );
  });

  it('persists pre-audit telemetry when audit_id is null', async () => {
    fetchTokenMocks.fetchIntakeTokenRowForRespond.mockResolvedValue({
      id: 'token-row-kpi-pre',
      consultant_id: 'consultant-pre',
      audit_id: null,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      responses: {},
    });
    const { status, json, res } = createMockRes();
    await postIntakeIntelligenceKpiController(
      {
        params: { token: VALID_TOKEN },
        body: { event: 'drop_off', client_session_id: 'sess-2' },
      } as unknown as import('express').Request,
      res,
    );
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ ok: true, persisted: true });
    expect(insertMocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        audit_id: null,
        event_type: 'intake_intelligence_pre_audit_kpi',
        data: expect.objectContaining({
          pre_audit: true,
          intake_token_id: 'token-row-kpi-pre',
          consultant_id: 'consultant-pre',
        }),
      }),
    );
  });

  it('accepts drop_off without question_id', async () => {
    const { status, json, res } = createMockRes();
    await postIntakeIntelligenceKpiController(
      { params: { token: VALID_TOKEN }, body: { kind: 'drop_off' } } as unknown as import('express').Request,
      res,
    );
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ ok: true, persisted: true });
    expect(insertMocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: PIPELINE_EVENT_TYPES.intakeIntelligenceDropOff,
      }),
    );
  });
});
