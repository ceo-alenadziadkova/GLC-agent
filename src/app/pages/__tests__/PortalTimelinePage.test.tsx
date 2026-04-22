import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ORCHESTRATION_PACK_SCHEMA_VERSION } from '../../config/orchestration-contract';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
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
const postStrategyExecutionPackMock = vi.fn();

vi.mock('../../data/apiService', () => ({
  api: {
    getAuditTimeline: (...args: unknown[]) => getAuditTimelineMock(...args),
    listStrategyExecutionPacks: (...args: unknown[]) => listStrategyExecutionPacksMock(...args),
    postStrategyExecutionPack: (...args: unknown[]) => postStrategyExecutionPackMock(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
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
    postStrategyExecutionPackMock.mockResolvedValue({ id: 'pack-1', payload: { packs: [] } });
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
    expect(screen.queryByText(/Timeline API status/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/missing_pack/i)).not.toBeInTheDocument();
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

  it('explains degraded timeline with data gaps and still opens plan map when pack exists', async () => {
    const user = userEvent.setup();
    useProfileMock.mockReturnValue({ isClient: false });
    getAuditTimelineMock.mockResolvedValue({
      timeline: {
        status: 'degraded',
        version: {
          roadmap_version: 1,
          manifest_snapshot_id: 'snap-d',
          latest_manifest_snapshot_id: 'snap-d',
          stale_manifest: false,
          manifest_state: 'confirmed',
        },
        seasons: [
          { id: 'near', node_ids: [] },
          { id: 'mid', node_ids: [] },
          { id: 'far', node_ids: [] },
        ],
        lanes: [
          {
            lane_id: 'seo',
            items: [{ id: 'a', title: 'SEO item', domain: 'seo_digital', lane: 'seo' }],
          },
        ],
        dependencies: [],
        top_7d: [],
        top_30d: [],
        waiting_list_domains: [],
        data_gaps: {
          degraded_input: true,
          fallback_reason_code: 'director_slice_missing',
          dangling_dependencies: 0,
          missing_confidence: 2,
          missing_risk: 1,
        },
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
          orchestration_pack_version: 1,
          glc_orchestration_pack: {
            version: ORCHESTRATION_PACK_SCHEMA_VERSION,
            graph: {
              nodes: [{ id: 'a', title: 'Alpha', domain: 'seo_digital', lane: 'seo' }],
              edges: [],
            },
            lanes: {
              product_change: [],
              tech_delivery: [],
              marketing_narrative: [],
              seo: ['a'],
              processes_automation: [],
              risk_compliance: [],
            },
            critical_path: ['a'],
            conflicts_resolved: [],
            manifest_snapshot_id: 'snap-d',
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter initialEntries={['/timeline/audit-1']}>
        <Routes>
          <Route path="/timeline/:id" element={<PortalTimelinePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: ORCHESTRATION_UI_COPY.timelineStateDegradedTitle })).toBeInTheDocument();
    expect(screen.getByText(new RegExp('director layer', 'i'))).toBeInTheDocument();
    expect(screen.getByText(ORCHESTRATION_UI_COPY.timelineDegradedEmptySeasonBucketsHint)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: ORCHESTRATION_UI_COPY.portalTimelineTabPlanMap }));
    expect(await screen.findByText(ORCHESTRATION_UI_COPY.timelinePlanMapDegradedNote)).toBeInTheDocument();
  });

  it('shows pack dependency map panel when strategy includes a valid orchestration pack', async () => {
    const user = userEvent.setup();
    useProfileMock.mockReturnValue({ isClient: true });
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
          orchestration_pack_version: 1,
          glc_orchestration_pack: {
            version: ORCHESTRATION_PACK_SCHEMA_VERSION,
            graph: {
              nodes: [
                { id: 'a', title: 'Alpha step', domain: 'seo_digital', lane: 'seo' },
                { id: 'b', title: 'Beta step', domain: 'tech_infrastructure', lane: 'tech_delivery' },
              ],
              edges: [{ from: 'a', to: 'b', relation: 'strong' }],
            },
            lanes: {
              product_change: [],
              tech_delivery: ['b'],
              marketing_narrative: [],
              seo: ['a'],
              processes_automation: [],
              risk_compliance: [],
            },
            critical_path: ['a', 'b'],
            conflicts_resolved: [],
            manifest_snapshot_id: 'snap-test',
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

    await user.click(
      await screen.findByRole('tab', { name: ORCHESTRATION_UI_COPY.portalTimelineTabPlanMap }),
    );
    const graphRegion = await screen.findByRole('region', {
      name: ORCHESTRATION_UI_COPY.timelinePackGraphSectionTitle,
    });
    expect(graphRegion).toBeInTheDocument();
    expect(graphRegion.textContent).toContain('Alpha step');
    expect(
      screen.getByRole('button', { name: ORCHESTRATION_UI_COPY.timelinePackGraphCopyDot }),
    ).toBeInTheDocument();
  });

  it('shows Detail pack on top actions for client when timeline is ready', async () => {
    useProfileMock.mockReturnValue({ isClient: true });
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
        seasons: [
          { id: 'near', node_ids: [] },
          { id: 'mid', node_ids: [] },
          { id: 'far', node_ids: [] },
        ],
        lanes: [
          {
            lane_id: 'seo',
            items: [{ id: 'node-top', title: 'Fix crawl budget', lane: 'seo' }],
          },
        ],
        dependencies: [],
        top_7d: ['node-top'],
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

    expect(
      await screen.findByRole('button', {
        name: `${ORCHESTRATION_UI_COPY.executionPackFromTimelineCtaAriaLabel} Fix crawl budget (${ORCHESTRATION_UI_COPY.topActions7dLabel})`,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(ORCHESTRATION_UI_COPY.executionPackFromTopActionsHint)).toBeInTheDocument();
  });

  it('posts execution pack when Detail pack is clicked', async () => {
    const user = userEvent.setup();
    useProfileMock.mockReturnValue({ isClient: true });
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
        seasons: [
          { id: 'near', node_ids: [] },
          { id: 'mid', node_ids: [] },
          { id: 'far', node_ids: [] },
        ],
        lanes: [
          {
            lane_id: 'seo',
            items: [{ id: 'node-top', title: 'Fix crawl budget', lane: 'seo' }],
          },
        ],
        dependencies: [],
        top_7d: ['node-top'],
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

    const btn = await screen.findByRole('button', {
      name: `${ORCHESTRATION_UI_COPY.executionPackFromTimelineCtaAriaLabel} Fix crawl budget (${ORCHESTRATION_UI_COPY.topActions7dLabel})`,
    });
    await user.click(btn);
    expect(postStrategyExecutionPackMock).toHaveBeenCalledWith('audit-1', { initiative_ids: ['node-top'] });
  });

  it('toasts mapped error when execution pack API returns disabled', async () => {
    const user = userEvent.setup();
    const { toast } = await import('sonner');
    const { ApiError } = await import('../../data/api-error');
    const { STRATEGY_EXECUTION_PACK_API_ERROR_CODES } = await import('../../config/strategy-execution-pack-api-error-codes');

    postStrategyExecutionPackMock.mockRejectedValue(
      new ApiError('Execution plan generation is disabled', 403, STRATEGY_EXECUTION_PACK_API_ERROR_CODES.STRATEGY_EXECUTION_PACK_DISABLED),
    );

    useProfileMock.mockReturnValue({ isClient: true });
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
        seasons: [
          { id: 'near', node_ids: [] },
          { id: 'mid', node_ids: [] },
          { id: 'far', node_ids: [] },
        ],
        lanes: [
          {
            lane_id: 'seo',
            items: [{ id: 'node-top', title: 'Fix crawl budget', lane: 'seo' }],
          },
        ],
        dependencies: [],
        top_7d: ['node-top'],
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

    const btn = await screen.findByRole('button', {
      name: `${ORCHESTRATION_UI_COPY.executionPackFromTimelineCtaAriaLabel} Fix crawl budget (${ORCHESTRATION_UI_COPY.topActions7dLabel})`,
    });
    await user.click(btn);
    expect(toast.error).toHaveBeenCalledWith(ORCHESTRATION_UI_COPY.executionPackFromTimelineErrorDisabled);
  });

  it('shows cross-lane narrative when there are blocking cross-lane dependencies', async () => {
    const user = userEvent.setup();
    useProfileMock.mockReturnValue({ isClient: true });
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
        seasons: [
          { id: 'near', node_ids: [] },
          { id: 'mid', node_ids: [] },
          { id: 'far', node_ids: [] },
        ],
        lanes: [
          {
            lane_id: 'seo',
            items: [{ id: 'a', title: 'Launch content', lane: 'seo' }],
          },
          {
            lane_id: 'tech_delivery',
            items: [{ id: 'b', title: 'Ship CMS', lane: 'tech_delivery' }],
          },
        ],
        dependencies: [
          {
            from: 'b',
            to: 'a',
            blocking: true,
            cross_lane: true,
            relation: 'must_precede',
          },
        ],
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

    await user.click(
      await screen.findByRole('tab', { name: ORCHESTRATION_UI_COPY.portalTimelineTabDependencies }),
    );
    expect(await screen.findByText(ORCHESTRATION_UI_COPY.timelineCrossLaneNarrativeTitle)).toBeInTheDocument();
    expect(screen.getByText(ORCHESTRATION_UI_COPY.timelineCrossLaneNarrativeBody)).toBeInTheDocument();
  });

  it('renders explain decision cards and limited context fallback badge', async () => {
    const user = userEvent.setup();
    useProfileMock.mockReturnValue({ isClient: true });
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
        seasons: [{ id: 'near', node_ids: ['n1'] }, { id: 'mid', node_ids: [] }, { id: 'far', node_ids: [] }],
        lanes: [
          {
            lane_id: 'seo',
            items: [
              {
                id: 'n1',
                title: 'Improve crawl budget',
                lane: 'seo',
                domain: 'seo_digital',
                explain: {
                  why: ['Reduces indexation lag'],
                  how: { description: 'Roll out sitemap and internal linking updates' },
                  time: { bucket: 'now', time_to_value: '2 weeks' },
                  impact: { score: 4, label: 'high' },
                  risks: ['Requires dev queue alignment'],
                  limited_context: true,
                },
              },
            ],
          },
        ],
        dependencies: [],
        top_7d: ['n1'],
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

    const summaries = await screen.findAllByText(ORCHESTRATION_UI_COPY.timelineDecisionCardSummary);
    expect(summaries.length).toBeGreaterThan(0);
    await user.click(summaries[0]!);
    expect(screen.getAllByText(ORCHESTRATION_UI_COPY.timelineLimitedContextBadge).length).toBeGreaterThan(0);
    expect(screen.getAllByText(ORCHESTRATION_UI_COPY.timelineDecisionWhyLabel).length).toBeGreaterThan(0);
  });
});
