/**
 * Automated accessibility regression for Delivery Board card chrome (ADR P0 axe bar).
 * Complements Lighthouse spot-check runbook in docs/DEPLOYMENT.md § Delivery Board — monitoring.
 */
import type { ReactElement } from 'react';

import { DndContext } from '@dnd-kit/core';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import type { PlanBoardCardDto } from '../../../../data/api/audits-orchestration';
import { PlanBoardOperationalCard } from '../BoardView';

const BASE_CARD: PlanBoardCardDto = {
  id: 'card-row-a11y',
  source: 'pack',
  column_id: 'next_up',
  position: 1,
  pinned: false,
  delivery_area: 'board',
  canonical_node_key: 'cnk_test',
  pack_graph_node_id: 'node-graph-1',
  orphaned_reason: null,
  title: 'Sample initiative for axe',
  lane: 'marketing_narrative',
};

function renderWithDnd(ui: ReactElement) {
  return render(
    <DndContext onDragEnd={() => {}}>
      <ul>{ui}</ul>
    </DndContext>,
  );
}

describe('PlanBoardOperationalCard a11y', () => {
  it('has no axe violations on baseline card chrome', async () => {
    const { container } = renderWithDnd(
      <PlanBoardOperationalCard
        card={{ ...BASE_CARD, title: 'Checkout reliability hardening' }}
        columnId="next_up"
        dragLocked={false}
        expectedPackVersion={3}
        onMoveViaMenu={async () => {}}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations when orphan badges render', async () => {
    const { container } = renderWithDnd(
      <PlanBoardOperationalCard
        card={{
          ...BASE_CARD,
          orphaned_reason: 'node_removed',
        }}
        columnId="backlog"
        dragLocked={false}
        expectedPackVersion={2}
        onMoveViaMenu={async () => {}}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations when manual backlog banner shows', async () => {
    const manual: PlanBoardCardDto = {
      ...BASE_CARD,
      source: 'manual',
      canonical_node_key: null,
      pack_graph_node_id: null,
      title: 'Consultant-tracked backlog item',
    };
    const { container } = renderWithDnd(
      <PlanBoardOperationalCard
        card={manual}
        columnId="in_progress"
        dragLocked
        expectedPackVersion={2}
        onMoveViaMenu={async () => {}}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
