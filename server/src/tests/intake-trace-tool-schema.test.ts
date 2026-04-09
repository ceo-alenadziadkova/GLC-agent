import { describe, expect, it } from 'vitest';
import {
  intakeTraceToolAnalyticsBatchSchema,
  intakeTraceToolPublicationLogQuerySchema,
  intakeTraceToolWordingDraftsPutSchema,
  intakeTraceToolWordingPublishSchema,
  intakeTraceToolWordingRollbackSchema,
} from '../schemas/intake-trace-tool.js';

describe('intakeTraceToolAnalyticsBatchSchema', () => {
  it('accepts tab_opened with payload', () => {
    const r = intakeTraceToolAnalyticsBatchSchema.safeParse({
      client_session_id: '550e8400-e29b-41d4-a716-446655440000',
      ia_v2_enabled: true,
      events: [
        {
          event_type: 'intake_trace_tab_opened',
          payload: { route: '/admin/intake-trace', workspace_mode: 'diagnose', panel: 'tree' },
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('rejects unknown event_type', () => {
    const r = intakeTraceToolAnalyticsBatchSchema.safeParse({
      client_session_id: '550e8400-e29b-41d4-a716-446655440000',
      events: [{ event_type: 'question_shown' }],
    });
    expect(r.success).toBe(false);
  });
});

describe('intakeTraceToolWordingDraftsPutSchema', () => {
  it('accepts replace_all with empty drafts', () => {
    const r = intakeTraceToolWordingDraftsPutSchema.safeParse({ drafts: {}, replace_all: true });
    expect(r.success).toBe(true);
  });

  it('rejects more than 500 keys', () => {
    const drafts: Record<string, string> = {};
    for (let i = 0; i < 501; i += 1) drafts[`k${i}`] = 'x';
    const r = intakeTraceToolWordingDraftsPutSchema.safeParse({ drafts });
    expect(r.success).toBe(false);
  });
});

describe('intakeTraceToolWordingPublishSchema', () => {
  it('accepts empty body', () => {
    const r = intakeTraceToolWordingPublishSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it('accepts question_ids filter', () => {
    const r = intakeTraceToolWordingPublishSchema.safeParse({ question_ids: ['q1', 'q2'] });
    expect(r.success).toBe(true);
  });
});

describe('intakeTraceToolWordingRollbackSchema', () => {
  it('accepts empty body', () => {
    const r = intakeTraceToolWordingRollbackSchema.safeParse({});
    expect(r.success).toBe(true);
  });
});

describe('intakeTraceToolPublicationLogQuerySchema', () => {
  it('defaults limit to 30', () => {
    const r = intakeTraceToolPublicationLogQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(30);
  });

  it('coerces limit and caps at 100', () => {
    const r = intakeTraceToolPublicationLogQuerySchema.safeParse({ limit: '500' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(100);
  });

  it('uses first query value when array', () => {
    const r = intakeTraceToolPublicationLogQuerySchema.safeParse({ limit: ['12', '99'] });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(12);
  });
});
