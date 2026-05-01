import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { MemoryRouter, Route, Routes } from 'react-router';

import { PortalPlanPage } from '../PortalPlanPage';

vi.mock('../../PortalRoadmapGanttPage', () => ({
  PortalRoadmapGanttSurface: () => <div data-testid="roadmap-surface-stub">roadmap stub</div>,
}));

vi.mock('../../PortalTimelinePage', () => ({
  PortalTimelineSurface: () => <div data-testid="timeline-surface-stub">timeline stub</div>,
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

vi.mock('../../hooks/useProfile', () => ({
  useProfile: () => ({ isClient: false }),
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

  it('roadmap-first URL mounts roadmap only until timeline visited', () => {
    renderPlan('/plan/test-audit?foo=1');
    expect(screen.getByTestId('roadmap-surface-stub')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="portal-plan-timeline-panel"]')).toBeNull();
    const roadmapPanel = document.querySelector('[data-testid="portal-plan-roadmap-panel"]');
    expect(roadmapPanel).not.toHaveAttribute('hidden');
  });

  it('timeline-first deep link mounts timeline only until roadmap visited', () => {
    renderPlan('/plan/test-audit?view=timeline');
    expect(screen.getByTestId('timeline-surface-stub')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="portal-plan-roadmap-panel"]')).toBeNull();
    const timelinePanel = document.querySelector('[data-testid="portal-plan-timeline-panel"]');
    expect(timelinePanel).not.toHaveAttribute('hidden');
  });

  it('after visiting both tabs, inactive panel stays mounted hidden + inert', async () => {
    const router = createMemoryRouter(
      [{ path: '/plan/:id', element: <PortalPlanPage /> }],
      { initialEntries: ['/plan/test-audit'] },
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId('roadmap-surface-stub')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="portal-plan-timeline-panel"]')).toBeNull();

    await act(async () => {
      await router.navigate('/plan/test-audit?view=timeline');
    });
    await waitFor(() => expect(screen.getByTestId('timeline-surface-stub')).toBeInTheDocument());

    const roadmapPanel = document.querySelector('[data-testid="portal-plan-roadmap-panel"]');
    const timelinePanel = document.querySelector('[data-testid="portal-plan-timeline-panel"]');
    expect(roadmapPanel).toHaveAttribute('hidden');
    expect(roadmapPanel).toHaveAttribute('inert');
    expect(timelinePanel).not.toHaveAttribute('hidden');
  });
});
