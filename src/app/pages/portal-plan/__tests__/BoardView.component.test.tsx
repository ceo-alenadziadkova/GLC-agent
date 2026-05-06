import { DndContext } from '@dnd-kit/core';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { PLAN_BOARD_COLUMN_HEADINGS_EN, PLAN_BOARD_UI_COLUMNS } from '../../../config/plan-board-ui-columns';
import { PLAN_BOARD_COPY } from '../../../config/plan-board-copy.en';
import type { PlanBoardCardDto } from '../../../data/api/audits-orchestration';
import { PlanBoardOperationalCard } from '../board/BoardView';
import { BoardColumnShell } from '../board/plan-board-column-shell';
import { PlanBoardBacklogPanel } from '../board/plan-board-backlog-panel';

const DEFAULT_MOVE_MENU = PLAN_BOARD_UI_COLUMNS.map((id) => ({
  id,
  title: PLAN_BOARD_COLUMN_HEADINGS_EN[id],
}));

const BASE_CARD: PlanBoardCardDto = {
  id: 'card-1',
  source: 'pack',
  column_id: 'backlog',
  position: 0,
  pinned: false,
  delivery_area: 'board',
  canonical_node_key: 'cnk_board_test',
  pack_graph_node_id: 'node-1',
  orphaned_reason: null,
  title: 'Board surface card',
  lane: 'marketing_narrative',
};

describe('Delivery Board extracted shell (RTL)', () => {
  it('renders backlog column inside horizontal scroller landmark with backlog test id', () => {
    render(
      <DndContext onDragEnd={() => {}}>
        <div className="overflow-x-auto">
          <div className="flex min-w-min flex-nowrap gap-3">
            <PlanBoardBacklogPanel isBacklog>
              <BoardColumnShell columnId="backlog" heading={PLAN_BOARD_COLUMN_HEADINGS_EN.backlog}>
                <li className="text-muted-foreground text-xs">empty</li>
              </BoardColumnShell>
            </PlanBoardBacklogPanel>
          </div>
        </div>
      </DndContext>,
    );
    expect(screen.getByTestId('plan-board-backlog-panel')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: PLAN_BOARD_COLUMN_HEADINGS_EN.backlog })).toBeInTheDocument();
  });

  it('shows Open on roadmap link when href is provided', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <DndContext onDragEnd={() => {}}>
          <PlanBoardOperationalCard
            card={BASE_CARD}
            columnId="backlog"
            dragLocked={false}
            expectedPackVersion={2}
            moveMenuColumns={DEFAULT_MOVE_MENU}
            openOnRoadmapHref="/plan/audit-x?view=roadmap&focus=cnk"
            onMoveViaMenu={async () => {}}
          />
        </DndContext>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: PLAN_BOARD_COPY.cardMenuAriaLabel }));
    expect(screen.getByRole('menuitem', { name: PLAN_BOARD_COPY.openOnRoadmapMenuLabel })).toBeInTheDocument();
  });
});
