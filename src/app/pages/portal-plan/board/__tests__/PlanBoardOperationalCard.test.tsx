import type { ReactElement } from 'react';

import { DndContext } from '@dnd-kit/core';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PLAN_BOARD_COPY } from '../../../../config/plan-board-copy.en';
import type { PlanBoardCardDto } from '../../../../data/api/audits-orchestration';
import { PlanBoardOperationalCard } from '../BoardView';

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
        onMoveViaMenu={onMove}
      />,
    );

    await user.click(screen.getByRole('button', { name: PLAN_BOARD_COPY.cardMenuAriaLabel }));
    expect(await screen.findByText(PLAN_BOARD_COPY.menuMoveHeading)).toBeInTheDocument();
  });

  it('shows edit and delete actions for mutable card', async () => {
    const user = userEvent.setup();
    const onEditTitle = vi.fn().mockResolvedValue(undefined);
    const onEditLane = vi.fn().mockResolvedValue(undefined);
    const onDeleteCard = vi.fn().mockResolvedValue(undefined);

    renderWithDnd(
      <PlanBoardOperationalCard
        card={BASE_CARD}
        columnId="next_up"
        dragLocked={false}
        expectedPackVersion={3}
        onMoveViaMenu={async () => {}}
        canMutateCard
        onEditTitle={onEditTitle}
        onEditLane={onEditLane}
        onDeleteCard={onDeleteCard}
      />,
    );

    await user.click(screen.getByRole('button', { name: PLAN_BOARD_COPY.cardMenuAriaLabel }));
    expect(await screen.findByText('Edit title')).toBeInTheDocument();
    expect(screen.getByText('Edit lane')).toBeInTheDocument();
    expect(screen.getByText('Delete card')).toBeInTheDocument();
    await user.click(screen.getByText('Edit title'));

    expect(onEditTitle).toHaveBeenCalledTimes(1);
    expect(onEditLane).toHaveBeenCalledTimes(0);
    expect(onDeleteCard).toHaveBeenCalledTimes(0);
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
        onMoveViaMenu={async () => {}}
      />,
    );

    expect(screen.getByText(PLAN_BOARD_COPY.manualBeyondNextUpBanner)).toBeInTheDocument();
  });
});
