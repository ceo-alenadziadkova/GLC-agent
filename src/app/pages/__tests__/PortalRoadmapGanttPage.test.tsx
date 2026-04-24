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
    window.localStorage.clear();
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

    const coreApiLabels = await screen.findAllByText('Core API');
    expect(coreApiLabels.length).toBeGreaterThan(0);
    expect(await screen.findByText('Roadmap timeline')).toBeInTheDocument();
    const ganttItem = view.container.querySelector('.rct-item');
    expect(ganttItem).not.toBeNull();
    await user.click(ganttItem as HTMLElement);
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText('tech_infrastructure')).toBeInTheDocument();
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

    await screen.findByText('Roadmap timeline');
    await user.click(screen.getByRole('button', { name: 'Dependencies' }));
    await screen.findByText('Dependency graph');
    const dependencyArrow = view.container.querySelector('svg path.cursor-pointer');
    expect(dependencyArrow).not.toBeNull();
    await user.click(dependencyArrow as HTMLElement);
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText('marketing_utp')).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: 'Dependencies' }));
    await user.click(screen.getByRole('button', { name: 'Table' }));
    expect(await screen.findByText('No dependencies match current filters. Clear filters.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Timeline' }));
    await user.selectOptions(screen.getByLabelText('Dependency type'), 'FS');
    await user.click(screen.getByRole('button', { name: 'Dependencies' }));
    await user.click(screen.getByRole('button', { name: 'Table' }));
    expect(await screen.findByText('Finish -> Start')).toBeInTheDocument();
  });

  it('supports keyboard navigation on timeline grid with arrow keys', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const grid = await screen.findByTestId('roadmap-timeline-grid');
    grid.focus();
    await user.keyboard('{ArrowRight}');
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('supports sorting dependency table by columns', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Roadmap timeline');
    await user.click(screen.getByRole('button', { name: 'Dependencies' }));
    await user.click(screen.getByRole('button', { name: 'Table' }));
    const typeHeader = screen.getByRole('button', { name: /^Type/ });
    await user.click(typeHeader);

    const sortedTypeHeader = screen.getByRole('button', { name: /Type (▲|▼)/ });
    expect(sortedTypeHeader).toBeInTheDocument();
  });

  it('shows day horizon controls in day scale and hides them in month scale', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const dayHorizonGroup = await screen.findByRole('group', { name: 'Day horizon' });
    expect(within(dayHorizonGroup).getByRole('button', { name: '30d' })).toBeInTheDocument();
    const range60 = within(dayHorizonGroup).getByRole('button', { name: '60d' });
    expect(range60).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(dayHorizonGroup).getByRole('button', { name: '90d' }));
    expect(within(dayHorizonGroup).getByRole('button', { name: '90d' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Months' }));
    expect(screen.queryByRole('group', { name: 'Day horizon' })).not.toBeInTheDocument();
  });

  it('restores timeline scale and day horizon from localStorage', async () => {
    window.localStorage.setItem('roadmap-gantt-time-scale', 'day');
    window.localStorage.setItem('roadmap-gantt-day-range', '90');
    window.localStorage.setItem('roadmap-gantt-density', 'compact');

    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const dayHorizonGroup = await screen.findByRole('group', { name: 'Day horizon' });
    expect(within(dayHorizonGroup).getByRole('button', { name: '90d' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Density')).toHaveValue('compact');
  });

  it('restores roadmap view state from URL query params', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1?scale=month&density=compact&depView=selected&blocked=1&depSort=type&depDir=desc&owner=marketing_utp&panel=dependencies&depTab=table']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('button', { name: 'Dependencies' });
    expect(screen.getByRole('button', { name: 'Dependencies' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Timeline' }));
    const scaleGroup = screen.getByLabelText('Timeline scale');
    expect(within(scaleGroup).getByText('Months')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Density')).toHaveValue('compact');
    expect(screen.getByLabelText('Dependency view')).toHaveValue('selected');
    expect(screen.getByLabelText('Owner')).toHaveValue('marketing_utp');
    expect(screen.getByLabelText('Blocked only')).toBeChecked();
  });

  it('applies quick filters and dependency visibility mode', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Roadmap timeline');
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    await user.selectOptions(screen.getByLabelText('Owner'), 'marketing_utp');
    expect(screen.getByText('Tasks 1')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Dependency view'), 'selected');
    expect(screen.getByText('Dependencies 0')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Blocked only' }));
    expect(screen.getByRole('checkbox', { name: 'Blocked only' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(screen.getByText('Tasks 2')).toBeInTheDocument();
  });

  it('renders timeline scroll controls and jump-to-today button', async () => {
    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Roadmap timeline');
    expect(screen.getByRole('button', { name: 'Scroll timeline left' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scroll timeline right' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
  });
});
