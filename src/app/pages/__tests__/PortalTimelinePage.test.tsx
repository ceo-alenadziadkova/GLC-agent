import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '../../lib/tanstack-react-query';

import { ORCHESTRATION_PACK_SCHEMA_VERSION } from '../../config/orchestration-contract';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { ORCHESTRATION_UI_LIMITS } from '../../config/orchestration-ui-limits';
import { APP_FEATURE_FLAGS } from '../../config/app-feature-flags';
import { PortalTimelinePage } from '../PortalTimelinePage';

const useAuditMock = vi.fn();
const useProfileMock = vi.fn();
const getAuditTimelineMock = vi.fn();
const getOrchestrationPackConditionalMock = vi.fn();
const useIsMobileMock = vi.fn(() => false);
const useAuthEmailMock = vi.fn(() => null);

vi.mock('../../hooks/useAuthEmail', () => ({
  useAuthEmail: () => useAuthEmailMock(),
}));

vi.mock('../../hooks/useAudit', () => ({
  useAudit: (...args: unknown[]) => useAuditMock(...args),
}));

vi.mock('../../hooks/useProfile', () => ({
  useProfile: () => useProfileMock(),
}));

vi.mock('../../components/ui/use-mobile', () => ({
  useIsMobile: () => useIsMobileMock(),
}));

/** PortalTimelinePage uses `useMediaQuery` for the mobile breakpoint, not `useIsMobile`; keep mocks aligned for dependency card rows. */
vi.mock('../../hooks/useMediaQuery', () => ({
  useMediaQuery: () => useIsMobileMock(),
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
const postOrchestrationPackMock = vi.fn();

vi.mock('../../data/apiService', () => ({
  api: {
    getAuditTimeline: (...args: unknown[]) => getAuditTimelineMock(...args),
    getOrchestrationPackConditional: (...args: unknown[]) => getOrchestrationPackConditionalMock(...args),
    listStrategyExecutionPacks: (...args: unknown[]) => listStrategyExecutionPacksMock(...args),
    postStrategyExecutionPack: (...args: unknown[]) => postStrategyExecutionPackMock(...args),
    postOrchestrationPack: (...args: unknown[]) => postOrchestrationPackMock(...args),
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
  const originalNarrativeFlag = APP_FEATURE_FLAGS.orchestrationRoadmapNarrativeEnabled;

  beforeEach(() => {
    vi.clearAllMocks();
    getOrchestrationPackConditionalMock.mockResolvedValue({
      kind: 'ok',
      data: {
        pack: null,
        orchestration_pack_version: 0,
        roadmap_version: 0,
        last_revision_diff: null,
        plan_governance: null,
      },
    });
    useIsMobileMock.mockReturnValue(false);
    useAuthEmailMock.mockReturnValue(null);
    (APP_FEATURE_FLAGS as { orchestrationRoadmapNarrativeEnabled: boolean }).orchestrationRoadmapNarrativeEnabled =
      originalNarrativeFlag;
    listStrategyExecutionPacksMock.mockResolvedValue({ items: [] });
    postStrategyExecutionPackMock.mockResolvedValue({ id: 'pack-1', payload: { packs: [] } });
    postOrchestrationPackMock.mockResolvedValue({
      pack: { graph: { nodes: [] }, lanes: {} },
      orchestration_pack_version: 1,
      roadmap_version: 1,
      last_revision_diff: null,
      last_revision_diff_summary: null,
      plan_governance: {
        unresolved_conflicts: 0,
        cycles_detected: 0,
        dangling_deps_count: 0,
        invalid_lane_assignments: 0,
        dependency_integrity_score: 1,
        confidence_coverage_score: 1,
        risk_coverage_score: 1,
        decision: 'allow',
        decision_hint: 'ok',
        reason_codes: [],
        blocking_reasons: [],
        warnings_soft: [],
        warnings: [],
      },
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

  it('renders milestones and top priority reasons when narrative flag is enabled', async () => {
    (APP_FEATURE_FLAGS as { orchestrationRoadmapNarrativeEnabled: boolean }).orchestrationRoadmapNarrativeEnabled =
      true;
    useProfileMock.mockReturnValue({ isClient: true });
    getAuditTimelineMock.mockResolvedValue({
      timeline: {
        status: 'ready',
        version: {
          roadmap_version: 3,
          manifest_snapshot_id: 'snap-1',
          latest_manifest_snapshot_id: 'snap-1',
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
            items: [{ id: 'n1', title: 'Improve crawl budget', lane: 'seo', domain: 'seo_digital' }],
          },
        ],
        dependencies: [],
        milestones: [{ id: 'ms_1_n1', label: 'Improve crawl budget', target_window_days: 7, unlocks: ['n1'] }],
        top_7d: ['n1'],
        top_30d: [],
        top_priorities: [{ bucket: '7d', action_id: 'n1', reason_code: 'near_term' }],
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

    const topActions = await screen.findByTestId('portal-timeline-top-actions');
    expect(topActions.textContent).toContain(ORCHESTRATION_UI_COPY.milestoneUnlocksLabel);
    expect(screen.getAllByText('Improve crawl budget').length).toBeGreaterThan(0);
    expect(screen.getByText(ORCHESTRATION_UI_COPY.topPriorityReasonLabel)).toBeInTheDocument();
    expect(screen.getByText('Highest short-term leverage')).toBeInTheDocument();
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

    expect(
      await screen.findByRole('heading', { name: /Timeline not populated yet/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(ORCHESTRATION_UI_COPY.timelineStateMissingPack)).toBeInTheDocument();
    expect(screen.getByText(ORCHESTRATION_UI_COPY.timelineEmptyCalloutClientHint)).toBeInTheDocument();
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

  it('shows sub-agent filter when timeline contains sub-agent sources', async () => {
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
        seasons: [{ id: 'near', node_ids: [] }, { id: 'mid', node_ids: [] }, { id: 'far', node_ids: [] }],
        lanes: [
          {
            lane_id: 'marketing_narrative',
            items: [
              { id: 'n1', title: 'Positioning', lane: 'marketing_narrative', domain: 'marketing_utp', source: 'sub_agent:cmo.agent_3_positioning' },
            ],
          },
        ],
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
    await user.click(
      await screen.findByRole('tab', { name: ORCHESTRATION_UI_COPY.portalTimelineTabWorkstreams }),
    );
    expect(await screen.findByText(ORCHESTRATION_UI_COPY.timelineSubAgentFilterLabel)).toBeInTheDocument();
  });

  it('supports keyboard navigation between timeline tabs', async () => {
    const user = userEvent.setup();
    useProfileMock.mockReturnValue({ isClient: true });
    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/timeline/audit-1']}>
        <Routes>
          <Route path="/portal/timeline/:id" element={<PortalTimelinePage />} />
        </Routes>
      </MemoryRouter>,
    );
    const overviewTab = await screen.findByRole('tab', { name: ORCHESTRATION_UI_COPY.portalTimelineTabOverview });
    overviewTab.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: ORCHESTRATION_UI_COPY.portalTimelineTabWorkstreams })).toHaveFocus();
  });

  it('renders dependency cards and limits rows on mobile dependency card mode', async () => {
    const user = userEvent.setup();
    useIsMobileMock.mockReturnValue(true);
    useProfileMock.mockReturnValue({ isClient: true });
    const seoItems = Array.from({ length: 12 }, (_, idx) => ({
      id: `a-${idx}`,
      title: `SEO item ${idx + 1}`,
      lane: 'seo',
    }));
    const techItems = Array.from({ length: 12 }, (_, idx) => ({
      id: `c-${idx}`,
      title: `Tech item ${idx + 1}`,
      lane: 'tech_delivery',
    }));
    const blockingDependencies = Array.from({ length: 12 }, (_, idx) => ({
      from: `a-${idx}`,
      to: `c-${idx}`,
      relation: 'strong' as const,
      cross_lane: true,
      blocking: true,
    }));
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
        seasons: [{ id: 'near', node_ids: [] }, { id: 'mid', node_ids: [] }, { id: 'far', node_ids: [] }],
        lanes: [
          { lane_id: 'seo', items: seoItems },
          { lane_id: 'tech_delivery', items: techItems },
        ],
        dependencies: blockingDependencies,
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
    await user.click(await screen.findByRole('tab', { name: ORCHESTRATION_UI_COPY.portalTimelineTabDependencies }));
    const blockingTitle = await screen.findByText(ORCHESTRATION_UI_COPY.timelineBlockingDepsTitle);
    const blockingCards = blockingTitle.parentElement?.querySelectorAll('article') ?? [];
    expect(blockingCards.length).toBe(ORCHESTRATION_UI_LIMITS.timelineDependencyCardsPerSectionMobile);
  });
});
