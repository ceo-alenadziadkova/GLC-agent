import { describe, expect, it } from 'vitest';

import { ROADMAP_GANTT_HEAVY_TASK_COUNT_THRESHOLD } from '../../config/roadmap-gantt-view-preferences';

describe('roadmap Gantt heavy-load policy', () => {
  it('defines a sane minimum threshold for skipping dependency arrow geometry', () => {
    expect(ROADMAP_GANTT_HEAVY_TASK_COUNT_THRESHOLD).toBeGreaterThanOrEqual(50);
    expect(ROADMAP_GANTT_HEAVY_TASK_COUNT_THRESHOLD).toBeLessThanOrEqual(500);
  });
});
