import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { MemoryRouter, Route, Routes } from 'react-router';

import { PortalPlanPage } from '../PortalPlanPage';

vi.mock('../../PortalRoadmapGanttPage', () => ({
  PortalRoadmapGanttSurface: () => <div data-testid="roadmap-surface-stub">roadmap stub</div>,
}));

vi.mock('../board/BoardView', () => ({
  PortalDeliveryBoardSurface: () => <div data-testid="board-surface-stub">board stub</div>,
}));

vi.mock('../PortalPlanOrchestrationProvider', () => ({
  PortalPlanOrchestrationProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="orch-provider-stub">{children}</div>
  ),
}));

vi.mock('../PortalPlanUnifiedShell', () => ({
  PortalPlanUnifiedShellCoordinator: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="unified-shell-stub">{children}</div>
  ),
}));

vi.mock('../../../hooks/useProfile', () => ({
  useProfile: () => ({ isClient: false }),
}));

/** Mirror production: Board rollout on; defer timeline fetch on Board tab. */
vi.mock('../../../config/plan-delivery-board-ui', () => ({
  isPlanDeliveryBoardUiEnabled: () => true,
  planOrchestrationIncludeTimelineForUnifiedPlanView: (v: string) => v !== 'board' && v !== 'table',
}));

vi.mock('../surfaces/PlanTableSurface', () => ({
  PlanTableSurface: () => <div data-testid="table-surface-stub">table stub</div>,
}));

describe('PortalPlanPage lazy dual-mount', () => {
  function renderPlan(initialPath: string) {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/plan/:id" element={<PortalPlanPage />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('default plan URL mounts board until roadmap visited (rollout ga)', async () => {
    renderPlan('/plan/test-audit?foo=1');
    await screen.findByTestId('board-surface-stub');
    expect(document.querySelector('[data-testid="portal-plan-roadmap-panel"]')).toBeNull();
    const boardPanel = document.querySelector('[data-testid="portal-plan-board-panel"]');
    expect(boardPanel).not.toHaveAttribute('hidden');
  });

  it('explicit roadmap mounts roadmap only until board visited', async () => {
    renderPlan('/plan/test-audit?view=roadmap');
    expect(screen.getByTestId('roadmap-surface-stub')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="portal-plan-board-panel"]')).toBeNull();
    const roadmapPanel = document.querySelector('[data-testid="portal-plan-roadmap-panel"]');
    expect(roadmapPanel).not.toHaveAttribute('hidden');
  });

  it('after visiting both tabs, inactive panel stays mounted hidden + inert', async () => {
    const router = createMemoryRouter(
      [{ path: '/plan/:id', element: <PortalPlanPage /> }],
      { initialEntries: ['/plan/test-audit?view=board'] },
    );

    render(<RouterProvider router={router} />);

    await screen.findByTestId('board-surface-stub');
    expect(document.querySelector('[data-testid="portal-plan-roadmap-panel"]')).toBeNull();

    await act(async () => {
      await router.navigate('/plan/test-audit?view=roadmap');
    });
    await waitFor(() => expect(screen.getByTestId('roadmap-surface-stub')).toBeInTheDocument());

    const roadmapPanel = document.querySelector('[data-testid="portal-plan-roadmap-panel"]');
    const boardPanel = document.querySelector('[data-testid="portal-plan-board-panel"]');
    expect(boardPanel).toHaveAttribute('hidden');
    expect(boardPanel).toHaveAttribute('inert');
    expect(roadmapPanel).not.toHaveAttribute('hidden');
  });

  it('legacy view=timeline in URL normalizes to board (no narrative timeline panel)', async () => {
    const router = createMemoryRouter([{ path: '/plan/:id', element: <PortalPlanPage /> }], {
      initialEntries: ['/plan/test-audit?view=timeline'],
    });
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(router.state.location.search).toMatch(/view=board/));
    expect(screen.queryByTestId('timeline-surface-stub')).toBeNull();
  });

  it('view=table mounts table surface stub', async () => {
    renderPlan('/plan/test-audit?view=table');
    await screen.findByTestId('table-surface-stub');
  });
});
