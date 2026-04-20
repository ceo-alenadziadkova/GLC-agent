import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { PortalTimelinePage } from '../PortalTimelinePage';

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

vi.mock('../strategy-lab/StrategyLabOrchestrationPanel', () => ({
  StrategyLabOrchestrationPanel: () => <div>panel</div>,
}));

vi.mock('../../features/report-viewer/components/ReportOrchestrationRoadmapSection', () => ({
  ReportOrchestrationRoadmapSection: () => <div>roadmap</div>,
}));

const listStrategyExecutionPacksMock = vi.fn();

vi.mock('../../data/apiService', () => ({
  api: {
    getAuditTimeline: (...args: unknown[]) => getAuditTimelineMock(...args),
    listStrategyExecutionPacks: (...args: unknown[]) => listStrategyExecutionPacksMock(...args),
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

describe('PortalTimelinePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listStrategyExecutionPacksMock.mockResolvedValue({ items: [] });
    getAuditTimelineMock.mockResolvedValue({
      timeline: {
        status: 'ready',
        version: {
          roadmap_version: 1,
          manifest_snapshot_id: null,
          latest_manifest_snapshot_id: null,
          stale_manifest: false,
          manifest_state: 'draft',
        },
        seasons: [],
        lanes: [],
        dependencies: [],
        top_7d: [],
        top_30d: [],
        waiting_list_domains: [],
        data_gaps: null,
      },
    });
    useAuditMock.mockReturnValue({
      loading: false,
      error: null,
      reload: vi.fn(),
      audit: {
        meta: {
          id: 'audit-1',
          execution_plan: { selected_domains: ['seo_digital'] },
        },
        strategy: { quick_wins: [] },
      },
    });
  });

  it('uses portal links for client role', () => {
    useProfileMock.mockReturnValue({ isClient: true });
    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/timeline/audit-1']}>
        <Routes>
          <Route path="/portal/timeline/:id" element={<PortalTimelinePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Full domain report/i })).toHaveAttribute(
      'href',
      '/portal/reports/audit-1',
    );
  });

  it('uses workspace links for consultant role', () => {
    useProfileMock.mockReturnValue({ isClient: false });
    renderWithProviders(
      <MemoryRouter initialEntries={['/timeline/audit-1']}>
        <Routes>
          <Route path="/timeline/:id" element={<PortalTimelinePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Full domain report/i })).toHaveAttribute('href', '/reports/audit-1');
    expect(screen.getByRole('link', { name: /Change scope or refresh the plan/i })).toHaveAttribute(
      'href',
      '/strategy/audit-1?focus=roadmap',
    );
  });

  it('shows prominent empty callout when pack is missing', async () => {
    useProfileMock.mockReturnValue({ isClient: true });
    getAuditTimelineMock.mockResolvedValue({
      timeline: {
        status: 'missing_pack',
        version: {
          roadmap_version: 0,
          manifest_snapshot_id: null,
          latest_manifest_snapshot_id: null,
          stale_manifest: false,
          manifest_state: 'draft',
        },
        seasons: [
          { id: 'near', node_ids: [] },
          { id: 'mid', node_ids: [] },
          { id: 'far', node_ids: [] },
        ],
        lanes: [],
        dependencies: [],
        top_7d: [],
        top_30d: [],
        waiting_list_domains: [],
        data_gaps: null,
      },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/timeline/audit-1']}>
        <Routes>
          <Route path="/portal/timeline/:id" element={<PortalTimelinePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Timeline not populated yet/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Your consultant confirms the roadmap manifest in Strategy Lab/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Timeline status code/i)).toBeInTheDocument();
    expect(screen.getByText(/missing_pack/i)).toBeInTheDocument();
  });

  it('shows timeline load error title and API detail when getAuditTimeline fails', async () => {
    useProfileMock.mockReturnValue({ isClient: true });
    const { ApiError } = await import('../../data/api-error');
    getAuditTimelineMock.mockRejectedValue(new ApiError('Audit not found', 404, 'AUDITS_NOT_FOUND'));

    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/timeline/audit-1']}>
        <Routes>
          <Route path="/portal/timeline/:id" element={<PortalTimelinePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Could not load execution timeline/i)).toBeInTheDocument();
    expect(screen.getByText(/Audit not found \(AUDITS_NOT_FOUND\)/i)).toBeInTheDocument();
  });

  it('shows human-readable revision story when last pack diff is on strategy', async () => {
    useProfileMock.mockReturnValue({ isClient: true });
    getAuditTimelineMock.mockResolvedValue({
      timeline: {
        status: 'ready',
        version: {
          roadmap_version: 2,
          manifest_snapshot_id: null,
          latest_manifest_snapshot_id: null,
          stale_manifest: false,
          manifest_state: 'published',
        },
        seasons: [
          { id: 'near', node_ids: [] },
          { id: 'mid', node_ids: [] },
          { id: 'far', node_ids: [] },
        ],
        lanes: [],
        dependencies: [],
        top_7d: [],
        top_30d: [],
        waiting_list_domains: [],
        data_gaps: null,
      },
    });
    useAuditMock.mockReturnValue({
      loading: false,
      error: null,
      reload: vi.fn(),
      audit: {
        meta: {
          id: 'audit-1',
          execution_plan: { selected_domains: ['seo_digital'] },
        },
        strategy: {
          quick_wins: [],
          orchestration_pack_version: 2,
          glc_orchestration_last_revision_diff: {
            from_version: 1,
            to_version: 2,
            nodes_added: ['node-a'],
            nodes_removed: [],
            nodes_lane_changed: [],
            edges_added: [],
            edges_removed: [],
            critical_path_changed: false,
            conflicts_resolved_before: 0,
            conflicts_resolved_after: 0,
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/timeline/audit-1']}>
        <Routes>
          <Route path="/portal/timeline/:id" element={<PortalTimelinePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('region', { name: /What changed in your plan/i })).toBeInTheDocument();
    expect(screen.getByText(/\+1 initiatives/)).toBeInTheDocument();
  });
});
