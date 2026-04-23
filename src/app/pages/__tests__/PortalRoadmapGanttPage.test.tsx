import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { PortalRoadmapGanttPage } from '../PortalRoadmapGanttPage';

const useAuditMock = vi.fn();
const useProfileMock = vi.fn();
const getAuditTimelineMock = vi.fn();

vi.mock('../../hooks/useAudit', () => ({
  useAudit: (...args: unknown[]) => useAuditMock(...args),
}));

vi.mock('../../hooks/useProfile', () => ({
  useProfile: () => useProfileMock(),
}));

vi.mock('../../components/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../data/apiService', () => ({
  api: {
    getAuditTimeline: (...args: unknown[]) => getAuditTimelineMock(...args),
  },
}));

function renderWithProviders(node: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

describe('PortalRoadmapGanttPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProfileMock.mockReturnValue({ isClient: true });
    useAuditMock.mockReturnValue({
      loading: false,
      error: null,
      audit: { meta: { id: 'audit-1' } },
    });
    getAuditTimelineMock.mockResolvedValue({
      timeline: {
        status: 'ready',
        version: {
          roadmap_version: 1,
          manifest_snapshot_id: null,
          latest_manifest_snapshot_id: null,
          stale_manifest: false,
          manifest_state: 'draft',
          plan_horizon: { start_date: '2026-01-01', end_date: '2026-03-31' },
        },
        seasons: [],
        lanes: [
          {
            lane_id: 'tech_delivery',
            items: [{ id: 'a', title: 'Core API', domain: 'tech_infrastructure', lane: 'tech_delivery', time_bucket: 'now' }],
          },
          {
            lane_id: 'marketing_narrative',
            items: [{ id: 'b', title: 'Launch campaign', domain: 'marketing_utp', lane: 'marketing_narrative', time_bucket: 'next' }],
          },
        ],
        dependencies: [{ from: 'a', to: 'b', relation: 'direct_blocker', blocking: true, cross_lane: true }],
        top_7d: [],
        top_30d: [],
        waiting_list_domains: [],
        data_gaps: null,
      },
    });
  });

  it('renders roadmap schedule and opens task details', async () => {
    const user = userEvent.setup();
    const view = renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Core API');
    expect(await screen.findByText('Dependency arrows (time-grid)')).toBeInTheDocument();
    const ganttItem = view.container.querySelector('.rct-item');
    expect(ganttItem).not.toBeNull();
    await user.click(ganttItem as HTMLElement);
    expect(await screen.findByText('Owner')).toBeInTheDocument();
  });

  it('opens target task details when dependency arrow is clicked', async () => {
    const user = userEvent.setup();
    const view = renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Dependency arrows (time-grid)');
    const dependencyArrow = view.container.querySelector('svg path.cursor-pointer');
    expect(dependencyArrow).not.toBeNull();
    await user.click(dependencyArrow as HTMLElement);
    expect(await screen.findByText('Owner')).toBeInTheDocument();
    expect(await screen.findByText('marketing_utp')).toBeInTheDocument();
  });

  it('filters dependency list by selected type', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const filter = await screen.findByLabelText('Dependency type');
    await user.selectOptions(filter, 'SS');
    expect(await screen.findByText('No dependencies for selected type')).toBeInTheDocument();
    await user.selectOptions(filter, 'FS');
    const depMapTitle = await screen.findByText('Dependencies map');
    const depSection = depMapTitle.closest('div');
    expect(depSection).not.toBeNull();
    expect(within(depSection as HTMLElement).getByText(/Core API -> Launch campaign/)).toBeInTheDocument();
    expect(within(depSection as HTMLElement).getByText('Finish -> Start')).toBeInTheDocument();
  });
});
