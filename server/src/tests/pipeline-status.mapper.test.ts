import { describe, expect, it } from 'vitest';
import { toPipelineStatusPayload } from '../services/pipeline-routes/mappers/pipeline-status.mapper.js';

describe('toPipelineStatusPayload', () => {
  it('keeps event_page.limit aligned with requested page size', () => {
    const payload = toPipelineStatusPayload(
      {
        status: 'running',
        current_phase: 3,
        tokens_used: 200,
        token_budget: 1000,
        execution_plan: null,
      },
      [
        { id: 1, created_at: '2026-01-01T00:00:00.000Z', data: {} },
        { id: 2, created_at: '2026-01-01T00:01:00.000Z', data: {} },
      ],
      [],
      'consultant',
      50,
      'debug',
    );

    expect(payload.event_page).toMatchObject({
      limit: 50,
      next_before: '2026-01-01T00:01:00.000Z',
      detail_level: 'debug',
    });
    expect(payload.events).toHaveLength(2);
  });
});
