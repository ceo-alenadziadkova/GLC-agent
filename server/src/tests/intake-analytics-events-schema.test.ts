import { describe, expect, it } from 'vitest';
import {
  intakeAnalyticsAuditBriefBatchSchema,
  intakeAnalyticsBatchBodySchema,
} from '../schemas/intake-analytics-events.js';

describe('intakeAnalyticsBatchBodySchema (public discovery)', () => {
  it('accepts a minimal valid batch', () => {
    const r = intakeAnalyticsBatchBodySchema.safeParse({
      surface: 'public_discovery',
      client_session_id: '550e8400-e29b-41d4-a716-446655440000',
      events: [{ event_type: 'question_shown', question_id: 'a2', step_index: 0 }],
    });
    expect(r.success).toBe(true);
  });

  it('accepts intake_versions partial and discovery token', () => {
    const r = intakeAnalyticsBatchBodySchema.safeParse({
      surface: 'public_discovery',
      client_session_id: '550e8400-e29b-41d4-a716-446655440000',
      discovery_session_token: 'a'.repeat(40),
      intake_versions: { policyVersion: '1.0.0', resolverVersion: '1.1.0' },
      events: [
        { event_type: 'wizard_completed', client_ts: '2026-01-15T12:00:00.000Z' },
        { event_type: 'results_viewed' },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('rejects invalid discovery token', () => {
    const r = intakeAnalyticsBatchBodySchema.safeParse({
      surface: 'public_discovery',
      client_session_id: '550e8400-e29b-41d4-a716-446655440000',
      discovery_session_token: 'not-hex',
      events: [{ event_type: 'question_shown' }],
    });
    expect(r.success).toBe(false);
  });

  it('rejects empty events', () => {
    const r = intakeAnalyticsBatchBodySchema.safeParse({
      surface: 'public_discovery',
      client_session_id: '550e8400-e29b-41d4-a716-446655440000',
      events: [],
    });
    expect(r.success).toBe(false);
  });
});

describe('intakeAnalyticsAuditBriefBatchSchema', () => {
  it('accepts consultant_interview and client_portal', () => {
    const r1 = intakeAnalyticsAuditBriefBatchSchema.safeParse({
      surface: 'consultant_interview',
      client_session_id: '550e8400-e29b-41d4-a716-446655440000',
      events: [{ event_type: 'question_shown', question_id: 'a1', step_index: 0 }],
    });
    expect(r1.success).toBe(true);

    const r2 = intakeAnalyticsAuditBriefBatchSchema.safeParse({
      surface: 'client_portal',
      client_session_id: '550e8400-e29b-41d4-a716-446655440000',
      intake_versions: { resolverVersion: '1.1.0' },
      events: [{ event_type: 'question_answered', question_id: 'b3' }],
    });
    expect(r2.success).toBe(true);
  });
});
