import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';

import { PlanWorkspaceLayout } from '../PlanWorkspaceLayout';
import { PLAN_WORKSPACE_NESTED_ROUTE_OBJECTS } from '../plan-workspace-nested-routes';

vi.mock('../../../components/PlanCommandPalette', () => ({
  PlanCommandPalette: () => null,
}));

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

const planWorkspaceRoute = {
  path: '/plan/:id',
  element: <PlanWorkspaceLayout />,
  children: PLAN_WORKSPACE_NESTED_ROUTE_OBJECTS,
};

describe('Plan workspace nested routes', () => {
  it('default plan URL redirects to board then mounts board only', async () => {
    const router = createMemoryRouter([planWorkspaceRoute], { initialEntries: ['/plan/test-audit?foo=1'] });
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(router.state.location.pathname).toMatch(/\/plan\/test-audit\/board$/));
    await screen.findByTestId('board-surface-stub');
    expect(document.querySelector('[data-testid="portal-plan-roadmap-panel"]')).toBeNull();
    const boardPanel = document.querySelector('[data-testid="portal-plan-board-panel"]');
    expect(boardPanel).not.toHaveAttribute('hidden');
  });

  it('explicit roadmap path mounts roadmap only', async () => {
    const router = createMemoryRouter([planWorkspaceRoute], { initialEntries: ['/plan/test-audit/roadmap'] });
    render(<RouterProvider router={router} />);
    expect(await screen.findByTestId('roadmap-surface-stub')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="portal-plan-board-panel"]')).toBeNull();
    const roadmapPanel = document.querySelector('[data-testid="portal-plan-roadmap-panel"]');
    expect(roadmapPanel).not.toHaveAttribute('hidden');
  });

  it('switching board -> roadmap unmounts board (no sticky dual-mount)', async () => {
    const router = createMemoryRouter([planWorkspaceRoute], { initialEntries: ['/plan/test-audit/board'] });
    render(<RouterProvider router={router} />);
    await screen.findByTestId('board-surface-stub');
    expect(document.querySelector('[data-testid="portal-plan-roadmap-panel"]')).toBeNull();

    await act(async () => {
      await router.navigate('/plan/test-audit/roadmap');
    });
    await waitFor(() => expect(screen.getByTestId('roadmap-surface-stub')).toBeInTheDocument());
    expect(document.querySelector('[data-testid="portal-plan-board-panel"]')).toBeNull();
  });

  it('legacy view=timeline on index normalizes to board path', async () => {
    const router = createMemoryRouter([planWorkspaceRoute], {
      initialEntries: ['/plan/test-audit?view=timeline'],
    });
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(router.state.location.pathname).toMatch(/\/plan\/test-audit\/board$/));
    expect(screen.queryByTestId('timeline-surface-stub')).toBeNull();
  });

  it('table path mounts table surface stub', async () => {
    const router = createMemoryRouter([planWorkspaceRoute], { initialEntries: ['/plan/test-audit/table'] });
    render(<RouterProvider router={router} />);
    await screen.findByTestId('table-surface-stub');
  });
});
