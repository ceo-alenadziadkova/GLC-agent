import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PLAN_BOARD_COPY } from '../../../config/plan-board-copy.en';
import { PLAN_BOARD_COLUMN_HEADINGS_EN } from '../../../config/plan-board-ui-columns';
import type { PlanBoardCardDto } from '../../../data/api/audits-orchestration';
import type { RoadmapGanttTask } from '../../../lib/roadmap-gantt-mapper';
import { ROADMAP_GANTT_MILESTONE_LANE_ID } from '../../../lib/roadmap-gantt-mapper';
import { TaskDetailsDrawer } from '../TaskDetailsDrawer';

const PATCH = vi.fn().mockResolvedValue({ ok: true, pack_version_used: 9 });

vi.mock('../../ui/drawer', () => ({
  Drawer: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div data-testid="mock-drawer">{children}</div> : null,
  DrawerContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DrawerHeader: ({ children }: { children: ReactNode }) => <header>{children}</header>,
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('../../../data/api/plan-board-queries', () => ({
  usePatchPlanBoardCardMutation: () => ({
    mutateAsync: PATCH,
    isPending: false,
  }),
}));

const BASE_TASK: RoadmapGanttTask = {
  id: 'graph-node-alpha',
  group: 'marketing_narrative',
  title: 'Task A',
  start_time: 0,
  end_time: 1,
  owner: 'Team',
  description: '',
  impact: '',
  status: 'planned',
  deliverables: [],
  dependencyIds: [],
  isEstimated: true,
  kind: 'task',
  onCriticalPath: false,
  isOverdue: false,
  topPriorityBucket: null,
  confidence: null,
  earlyStartMs: null,
  earlyFinishMs: null,
  lateStartMs: null,
  lateFinishMs: null,
  totalFloatMs: null,
  freeFloatMs: null,
};

const BOARD_ROW: PlanBoardCardDto = {
  id: 'delivery-row-1',
  source: 'pack',
  column_id: 'next_up',
  position: 0,
  pinned: false,
  delivery_area: 'board',
  canonical_node_key: 'ck_alpha',
  pack_graph_node_id: 'graph-node-alpha',
  orphaned_reason: null,
  title: 'Task A',
  lane: 'marketing_narrative',
};

describe('TaskDetailsDrawer Delivery Board PATCH (ADR §5)', () => {
  it('fires patch when consultant chooses another column', async () => {
    PATCH.mockClear();
    const user = userEvent.setup();

    render(
      <TaskDetailsDrawer
        auditId="audit-1"
        open
        onOpenChange={() => {}}
        task={BASE_TASK}
        dependencies={[]}
        taskTitleById={new Map()}
        downstreamTaskCount={0}
        planBoardMove={{
          status: 'ready',
          row: BOARD_ROW,
          packVersion: 8,
          role: 'consultant',
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: PLAN_BOARD_COPY.roadmapDrawerMoveMenuAriaLabel }));
    await user.click(screen.getByRole('menuitem', { name: PLAN_BOARD_COLUMN_HEADINGS_EN.in_progress }));

    expect(PATCH).toHaveBeenCalledWith({
      cardId: 'delivery-row-1',
      body: { to_column: 'in_progress', expected_pack_version: 8 },
    });
  });

  it('does not render move menu when task is milestone', () => {
    const milestone: RoadmapGanttTask = {
      ...BASE_TASK,
      group: ROADMAP_GANTT_MILESTONE_LANE_ID,
      kind: 'milestone',
    };

    render(
      <TaskDetailsDrawer
        auditId="audit-1"
        open
        onOpenChange={() => {}}
        task={milestone}
        dependencies={[]}
        taskTitleById={new Map()}
        downstreamTaskCount={0}
        planBoardMove={{
          status: 'ready',
          row: BOARD_ROW,
          packVersion: 8,
          role: 'consultant',
        }}
      />,
    );

    expect(screen.queryByRole('button', { name: PLAN_BOARD_COPY.roadmapDrawerMoveMenuAriaLabel })).toBeNull();
  });
});
