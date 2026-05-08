import { describe, expect, it } from 'vitest';

import { filterPlanBoardCardsForClientView, isPlanBoardCardRowVisibleToClient } from '../services/plan-board/plan-board-client-view.js';

describe('plan-board-client-view', () => {
  it('keeps pack-backed cards in client workflow columns only', () => {
    const rows = [
      { source: 'pack', column_id: 'next_up', delivery_area: 'board' },
      { source: 'pack', column_id: 'backlog', delivery_area: 'backlog' },
      { source: 'manual', column_id: 'backlog', delivery_area: 'backlog' },
      { source: 'pack', column_id: 'done', delivery_area: 'board' },
      { source: 'pack', column_id: 'in_progress', delivery_area: 'board' },
    ] as const;
    const filtered = filterPlanBoardCardsForClientView(rows);
    expect(filtered.map((r) => r.column_id)).toEqual(['next_up', 'done', 'in_progress']);
  });

  it('drops archived delivery area', () => {
    expect(
      isPlanBoardCardRowVisibleToClient({
        source: 'pack',
        column_id: 'done',
        delivery_area: 'archived',
      }),
    ).toBe(false);
  });

  it('respects custom client-visible column id set', () => {
    const visible = new Set(['nq', 'wip']);
    expect(
      filterPlanBoardCardsForClientView(
        [{ source: 'pack', column_id: 'nq', delivery_area: 'board' }],
        visible,
      ),
    ).toHaveLength(1);
    expect(
      filterPlanBoardCardsForClientView(
        [{ source: 'pack', column_id: 'icebox', delivery_area: 'backlog' }],
        visible,
      ),
    ).toHaveLength(0);
  });
});
