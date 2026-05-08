import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import type { ReactNode } from 'react';

import { PlanWorkspaceLayout } from '../PlanWorkspaceLayout';
import { PLAN_WORKSPACE_NESTED_ROUTE_OBJECTS } from '../plan-workspace-nested-routes';

vi.mock('../../../components/PlanCommandPalette', () => ({
  PlanCommandPalette: () => null,
}));

vi.mock('../PortalPlanOrchestrationProvider', () => ({
  PortalPlanOrchestrationProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="orch-provider-stub">{children}</div>
  ),
}));

vi.mock('../../PortalRoadmapGanttPage', async () => {
  const { PortalPlanSurfaceChrome } = await import('../PortalPlanUnifiedShell');
  return {
    PortalRoadmapGanttSurface: ({ unifiedShellTabActive }: { unifiedShellTabActive?: boolean }) => (
      <PortalPlanSurfaceChrome
        branch="roadmap"
        tabActive={unifiedShellTabActive}
        title="Roadmap shell title"
        subtitle="Roadmap subtitle"
      >
        <div data-testid="roadmap-surface-stub">roadmap</div>
      </PortalPlanSurfaceChrome>
    ),
  };
});

vi.mock('../board/BoardView', async () => {
  const { PortalPlanSurfaceChrome } = await import('../PortalPlanUnifiedShell');
  return {
    PortalDeliveryBoardSurface: ({ unifiedShellTabActive }: { unifiedShellTabActive?: boolean }) => (
      <PortalPlanSurfaceChrome
        branch="board"
        tabActive={unifiedShellTabActive}
        title="Board shell title"
        subtitle="Board subtitle"
      >
        <div data-testid="board-surface-stub">board</div>
      </PortalPlanSurfaceChrome>
    ),
  };
});

vi.mock('../../../hooks/useProfile', () => ({
  useProfile: () => ({ isClient: true }),
}));

vi.mock('../../../components/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <main data-testid="workspace-main">{children}</main>,
}));

const portalPlanWorkspaceRoute = {
  path: '/portal/plan/:id',
  element: <PlanWorkspaceLayout />,
  children: PLAN_WORKSPACE_NESTED_ROUTE_OBJECTS,
};

describe('Plan workspace unified shell landmarks', () => {
  it('keeps exactly one document main landmark when switching from defaulted board shell to roadmap', async () => {
    const router = createMemoryRouter([portalPlanWorkspaceRoute], { initialEntries: ['/portal/plan/e2e-audit'] });
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(router.state.location.pathname).toMatch(/\/portal\/plan\/e2e-audit\/board$/));
    expect(await screen.findByTestId('board-surface-stub')).toBeInTheDocument();

    await act(async () => {
      await router.navigate('/portal/plan/e2e-audit/roadmap');
    });
    await waitFor(() => expect(screen.getByTestId('roadmap-surface-stub')).toBeInTheDocument());

    expect(document.querySelectorAll('main')).toHaveLength(1);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByTestId('workspace-main')).toBeInTheDocument();
  });
});
