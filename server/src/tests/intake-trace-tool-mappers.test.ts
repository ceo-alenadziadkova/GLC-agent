import { describe, expect, it } from 'vitest';
import { mapPublicationLogEntries } from '../routes/intake-trace-tool/mappers/intake-trace-http.mapper.js';
import { mapDraftRowsToMaps, mapRowsToWordingActionTargets } from '../routes/intake-trace-tool/mappers/intake-trace-db.mapper.js';

describe('intake-trace-tool mappers', () => {
  it('builds drafts and published maps from draft rows', () => {
    const mapped = mapDraftRowsToMaps([
      { question_id: 'q1', draft_text: 'draft A', published_text: 'published A' },
      { question_id: 'q2', draft_text: 'draft B', published_text: '   ' },
      { question_id: null, draft_text: 'ignored', published_text: 'ignored' },
    ]);

    expect(mapped.drafts).toEqual({ q1: 'draft A', q2: 'draft B' });
    expect(mapped.published).toEqual({ q1: 'published A' });
  });

  it('filters wording action targets to non-empty question/text', () => {
    const targets = mapRowsToWordingActionTargets([
      { question_id: 'q1', source_text: 'hello' },
      { question_id: 'q2', source_text: '   ' },
      { question_id: null, source_text: 'world' },
    ]);

    expect(targets).toEqual([{ questionId: 'q1', text: 'hello' }]);
  });

  it('maps publication log rows and defaults unknown action to publish', () => {
    const entries = mapPublicationLogEntries([
      { id: '1', action: 'publish', question_ids: ['q1'], created_at: '2026-01-01T00:00:00.000Z' },
      { id: '2', action: 'rollback', question_ids: ['q2'], created_at: '2026-01-01T00:00:00.000Z' },
      { id: '3', action: null, question_ids: null, created_at: '2026-01-01T00:00:00.000Z' },
    ]);

    expect(entries).toEqual([
      { id: '1', action: 'publish', question_ids: ['q1'], created_at: '2026-01-01T00:00:00.000Z' },
      { id: '2', action: 'rollback', question_ids: ['q2'], created_at: '2026-01-01T00:00:00.000Z' },
      { id: '3', action: 'publish', question_ids: [], created_at: '2026-01-01T00:00:00.000Z' },
    ]);
  });
});
