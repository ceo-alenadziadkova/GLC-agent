import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import type { ReactNode } from 'react';

import { PortalPlanPage } from '../PortalPlanPage';

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

vi.mock('../../PortalTimelinePage', async () => {
  const { PortalPlanSurfaceChrome } = await import('../PortalPlanUnifiedShell');
  return {
    PortalTimelineSurface: ({ unifiedShellTabActive }: { unifiedShellTabActive?: boolean }) => (
      <PortalPlanSurfaceChrome
        branch="timeline"
        tabActive={unifiedShellTabActive}
        title="Timeline shell title"
        subtitle="Timeline subtitle"
      >
        <div data-testid="timeline-surface-stub">timeline</div>
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

describe('PortalPlanPage unified shell landmarks', () => {
  it('exposes exactly one document main landmark with real coordinator after both tabs were visited', async () => {
    const router = createMemoryRouter(
      [{ path: '/portal/plan/:id', element: <PortalPlanPage /> }],
      { initialEntries: ['/portal/plan/e2e-audit'] },
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId('roadmap-surface-stub')).toBeInTheDocument();

    await act(async () => {
      await router.navigate('/portal/plan/e2e-audit?view=timeline');
    });
    await waitFor(() => expect(screen.getByTestId('timeline-surface-stub')).toBeInTheDocument());

    expect(document.querySelectorAll('main')).toHaveLength(1);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByTestId('workspace-main')).toBeInTheDocument();
  });
});
