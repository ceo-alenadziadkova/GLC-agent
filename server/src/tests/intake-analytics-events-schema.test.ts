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

  it('accepts experiment_variant A/B and rejects others', () => {
    const ok = intakeAnalyticsBatchBodySchema.safeParse({
      surface: 'public_discovery',
      client_session_id: '550e8400-e29b-41d4-a716-446655440000',
      experiment_variant: 'A',
      events: [{ event_type: 'question_shown' }],
    });
    expect(ok.success).toBe(true);

    const bad = intakeAnalyticsBatchBodySchema.safeParse({
      surface: 'public_discovery',
      client_session_id: '550e8400-e29b-41d4-a716-446655440000',
      experiment_variant: 'C',
      events: [{ event_type: 'question_shown' }],
    });
    expect(bad.success).toBe(false);
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

  it('accepts optional experiment_variant for authenticated surfaces', () => {
    const r = intakeAnalyticsAuditBriefBatchSchema.safeParse({
      surface: 'client_form',
      client_session_id: '550e8400-e29b-41d4-a716-446655440000',
      experiment_variant: 'B',
      events: [{ event_type: 'question_answered', question_id: 'f1' }],
    });
    expect(r.success).toBe(true);
  });

  it('accepts ADR diagnostic pilot event types with optional fields', () => {
    const r = intakeAnalyticsAuditBriefBatchSchema.safeParse({
      surface: 'client_form',
      client_session_id: '550e8400-e29b-41d4-a716-446655440000',
      events: [
        {
          event_type: 'signal_confidence_changed',
          signal_key: 'operations_bottleneck',
          trace_codes: ['signal_confidence_low_missing'],
        },
        {
          event_type: 'readiness_blocked',
          audit_readiness_status: 'blocked',
          flow_readiness_status: 'blocked',
          trace_codes: ['audit_blocked_full_sla'],
        },
        {
          event_type: 'remediation_asked',
          remediation_bank_ids: ['a1', 'a3'],
        },
        {
          event_type: 'sequencing_transition_taken',
          transition_rule_ref: 'pilot_next_recommended',
          next_recommended: ['a2', 'a5'],
        },
        {
          event_type: 'guard_question_triggered',
          question_id: 'f1',
          signal_key: 'primary_problem',
        },
      ],
    });
    expect(r.success).toBe(true);
  });
});
