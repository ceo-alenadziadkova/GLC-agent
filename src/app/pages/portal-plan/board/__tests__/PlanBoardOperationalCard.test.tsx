import type { ReactElement } from 'react';

import { DndContext } from '@dnd-kit/core';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PLAN_BOARD_COLUMN_HEADINGS_EN, PLAN_BOARD_UI_COLUMNS } from '../../../../config/plan-board-ui-columns';
import { PLAN_BOARD_COPY } from '../../../../config/plan-board-copy.en';
import type { PlanBoardCardDto } from '../../../../data/api/orchestration-types';
import { PlanBoardOperationalCard } from '../PlanBoardOperationalCard';

const DEFAULT_MOVE_MENU = PLAN_BOARD_UI_COLUMNS.map((id) => ({
  id,
  title: PLAN_BOARD_COLUMN_HEADINGS_EN[id],
}));

const BASE_CARD: PlanBoardCardDto = {
  id: 'card-row-1',
  source: 'pack',
  column_id: 'next_up',
  position: 1,
  pinned: false,
  delivery_area: 'board',
  canonical_node_key: 'cnk_test',
  pack_graph_node_id: 'node-graph-1',
  orphaned_reason: null,
  title: 'Sample initiative',
  lane: 'marketing_narrative',
};

function renderWithDnd(ui: ReactElement) {
  return render(<DndContext onDragEnd={() => {}}>{ui}</DndContext>);
}

describe('PlanBoardOperationalCard', () => {
  it('exposes Move to column menu for keyboard / screen-reader parity (ADR)', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn().mockResolvedValue(undefined);

    renderWithDnd(
      <PlanBoardOperationalCard
        card={BASE_CARD}
        columnId="next_up"
        dragLocked={false}
        expectedPackVersion={3}
        moveMenuColumns={DEFAULT_MOVE_MENU}
        onMoveViaMenu={onMove}
      />,
    );

    await user.click(screen.getByRole('button', { name: PLAN_BOARD_COPY.cardMenuAriaLabel }));
    expect(await screen.findByText(PLAN_BOARD_COPY.menuMoveHeading)).toBeInTheDocument();
  });

  it('shows delete action and optional manifest owner-hint menu for mutable card', async () => {
    const user = userEvent.setup();
    const onDeleteCard = vi.fn().mockResolvedValue(undefined);

    renderWithDnd(
      <PlanBoardOperationalCard
        card={BASE_CARD}
        columnId="next_up"
        dragLocked={false}
        expectedPackVersion={3}
        moveMenuColumns={DEFAULT_MOVE_MENU}
        onMoveViaMenu={async () => {}}
        canMutateCard
        onCommitTitleInline={async () => {}}
        onCommitLaneInline={async () => {}}
        laneSelectOptions={[{ value: 'marketing_narrative', label: 'Marketing' }]}
        manifestDraftLaneHintsEnabled
        onDeleteCard={onDeleteCard}
      />,
    );

    await user.click(screen.getByRole('button', { name: PLAN_BOARD_COPY.cardMenuAriaLabel }));
    expect(await screen.findByText(PLAN_BOARD_COPY.menuRevisionOwnerHint)).toBeInTheDocument();
    expect(screen.getByText(PLAN_BOARD_COPY.menuDeleteCardLabel)).toBeInTheDocument();
    await user.click(screen.getByText(PLAN_BOARD_COPY.menuDeleteCardLabel));

    expect(onDeleteCard).toHaveBeenCalledTimes(1);
  });

  it('shows manual backlog alignment banner past next_up', () => {
    const manual: PlanBoardCardDto = {
      ...BASE_CARD,
      source: 'manual',
      canonical_node_key: null,
      pack_graph_node_id: null,
      title: 'Ad-hoc note',
    };

    renderWithDnd(
      <PlanBoardOperationalCard
        card={manual}
        columnId="in_progress"
        dragLocked
        expectedPackVersion={2}
        moveMenuColumns={DEFAULT_MOVE_MENU}
        onMoveViaMenu={async () => {}}
      />,
    );

    expect(screen.getByText(PLAN_BOARD_COPY.manualBeyondNextUpBanner)).toBeInTheDocument();
  });

  it('shows required primary markers on card', () => {
    renderWithDnd(
      <PlanBoardOperationalCard
        card={BASE_CARD}
        columnId="next_up"
        dragLocked={false}
        expectedPackVersion={3}
        moveMenuColumns={DEFAULT_MOVE_MENU}
        onMoveViaMenu={async () => {}}
        domainLabel="Marketing"
        priorityLevel="high"
        quickWin
        critical={false}
      />,
    );

    expect(screen.getByText('Scope: Marketing')).toBeInTheDocument();
    expect(screen.getByText('Priority: high')).toBeInTheDocument();
    expect(screen.getByText('Quick win')).toBeInTheDocument();
    expect(screen.getByText('Not critical')).toBeInTheDocument();
  });
});
