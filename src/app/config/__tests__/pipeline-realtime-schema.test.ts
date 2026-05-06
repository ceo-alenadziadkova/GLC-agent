import { describe, expect, it } from 'vitest';
import {
  parseAuditsRealtimePatch,
  parsePipelineEventInsertPayload,
} from '../pipeline-realtime-schema';

describe('pipeline-realtime-schema', () => {
  it('parsePipelineEventInsertPayload accepts a minimal Realtime INSERT row', () => {
    const row = {
      id: 42,
      audit_id: '550e8400-e29b-41d4-a716-446655440000',
      phase: 3,
      event_type: 'log',
      message: 'ok',
      created_at: '2026-01-15T12:00:00.000Z',
      data: { trace_id: 't1' },
    };
    const parsed = parsePipelineEventInsertPayload(row);
    expect(parsed).toEqual(row);
  });

  it('parsePipelineEventInsertPayload rejects missing data object', () => {
    expect(
      parsePipelineEventInsertPayload({
        id: 1,
        audit_id: 'a',
        phase: 0,
        event_type: 'started',
        message: null,
        created_at: '2026-01-15T12:00:00.000Z',
        data: null,
      }),
    ).toBeNull();
  });

  it('parsePipelineEventInsertPayload rejects invalid id', () => {
    expect(
      parsePipelineEventInsertPayload({
        id: '',
        audit_id: 'a',
        phase: 0,
        event_type: 'started',
        message: null,
        created_at: '2026-01-15T12:00:00.000Z',
        data: {},
      }),
    ).toBeNull();
  });

  it('parsePipelineEventInsertPayload accepts numeric event_seq when present', () => {
    const row = {
      id: 43,
      audit_id: '550e8400-e29b-41d4-a716-446655440000',
      phase: 1,
      event_type: 'log',
      message: 'ok',
      created_at: '2026-01-15T12:00:00.000Z',
      event_seq: 9001,
      data: {},
    };
    expect(parsePipelineEventInsertPayload(row)).toEqual(row);
  });

  it('parsePipelineEventInsertPayload rejects non-numeric event_seq', () => {
    expect(
      parsePipelineEventInsertPayload({
        id: 1,
        audit_id: 'a',
        phase: 0,
        event_type: 'started',
        message: null,
        created_at: '2026-01-15T12:00:00.000Z',
        event_seq: 'bad',
        data: {},
      }),
    ).toBeNull();
  });

  it('parseAuditsRealtimePatch extracts known header fields', () => {
    expect(
      parseAuditsRealtimePatch({
        id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'review',
        current_phase: 4,
        tokens_used: 1200,
        company_url: 'https://example.com',
      }),
    ).toEqual({
      status: 'review',
      current_phase: 4,
      tokens_used: 1200,
    });
  });

  it('parseAuditsRealtimePatch returns null when no known fields', () => {
    expect(parseAuditsRealtimePatch({ id: 'x', company_url: 'https://a' })).toBeNull();
  });

  it('parseAuditsRealtimePatch returns null for non-object', () => {
    expect(parseAuditsRealtimePatch(null)).toBeNull();
    expect(parseAuditsRealtimePatch('x')).toBeNull();
  });
});
