import { beforeEach, describe, expect, it, vi } from 'vitest';

const runDeterministicSnapshotMock = vi.hoisted(() => vi.fn());
const supabaseFromMock = vi.hoisted(() => vi.fn());

const queryBuilder = vi.hoisted(() => {
  const builder = {
    update: vi.fn(() => builder),
    eq: vi.fn(async () => ({ error: null })),
  };
  return builder;
});

vi.mock('../snapshot/run-snapshot.js', () => ({
  runDeterministicSnapshot: runDeterministicSnapshotMock,
}));

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: supabaseFromMock,
  },
}));

vi.mock('../services/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../services/notifications.js', () => ({
  emitStructuredNotification: vi.fn().mockResolvedValue(undefined),
}));

import { PIPELINE_EVENT_TYPES } from '../config/pipeline-event-types.js';
import { runFreeSnapshotService } from '../services/pipeline/freeSnapshotService.js';

describe('runFreeSnapshotService lifecycle events', () => {
  beforeEach(() => {
    supabaseFromMock.mockReset();
    supabaseFromMock.mockReturnValue(queryBuilder);
    queryBuilder.update.mockClear();
    queryBuilder.eq.mockClear();
    runDeterministicSnapshotMock.mockReset();
  });

  it('emits intermediate phase events around deterministic snapshot execution', async () => {
    const eventOrder: string[] = [];
    const emitEvent = vi.fn(async (phase: number, eventType: string) => {
      eventOrder.push(`${phase}:${eventType}`);
    });
    const preview = { score: 4, highlights: [] };
    runDeterministicSnapshotMock.mockImplementation(async () => {
      eventOrder.push('snapshot:run');
      return { preview };
    });

    await expect(runFreeSnapshotService({ auditId: 'audit-1', emitEvent })).resolves.toBe(preview);

    expect(eventOrder).toEqual([
      `0:${PIPELINE_EVENT_TYPES.started}`,
      `0:${PIPELINE_EVENT_TYPES.log}`,
      `4:${PIPELINE_EVENT_TYPES.started}`,
      'snapshot:run',
      `0:${PIPELINE_EVENT_TYPES.completed}`,
      `4:${PIPELINE_EVENT_TYPES.completed}`,
    ]);
    expect(emitEvent).toHaveBeenCalledWith(
      4,
      PIPELINE_EVENT_TYPES.started,
      'Free Snapshot: preview assembly started',
      expect.objectContaining({ snapshot_path: 'deterministic' }),
    );
  });
});
