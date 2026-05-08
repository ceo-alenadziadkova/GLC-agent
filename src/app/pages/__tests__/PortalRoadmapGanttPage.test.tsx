import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '../../lib/tanstack-react-query';
import type { ReactNode } from 'react';

import { PortalRoadmapGanttPage } from '../PortalRoadmapGanttPage';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { PLAN_WORKSPACE_UI_COPY } from '../../config/plan-workspace-ui-copy.en';
import { buildAppRoute } from '../../config/route-paths';
import { buildPlanWorkspaceHref } from '../../lib/plan-cross-nav';
import {
  ORCHESTRATION_LANE_LABELS,
  ORCHESTRATION_UI_COPY,
} from '../../config/orchestration-roadmap-ui-copy.en';
import * as RoadmapMapper from '../../lib/roadmap-gantt-mapper';
import { ORCHESTRATION_PACK_SCHEMA_VERSION } from '../../config/orchestration-contract';
import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';

const useAuditMock = vi.fn();
const useProfileMock = vi.fn();

const apiMocks = vi.hoisted(() => ({
  getAuditTimelineMock: vi.fn(),
  getOrchestrationPackMock: vi.fn(),
  getOrchestrationPackConditionalMock: vi.fn(),
  downloadOrchestrationSprintExportCsvMock: vi.fn(),
}));

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
    getAuditTimeline: (...args: unknown[]) => apiMocks.getAuditTimelineMock(...args),
    getOrchestrationPack: (...args: unknown[]) => apiMocks.getOrchestrationPackMock(...args),
    getOrchestrationPackConditional: (...args: unknown[]) => apiMocks.getOrchestrationPackConditionalMock(...args),
    downloadOrchestrationSprintExportCsv: (...args: unknown[]) => apiMocks.downloadOrchestrationSprintExportCsvMock(...args),
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

/** Open the More options popover (analysis, filters, actions, filtered task counts). */
async function expandRoadmapMoreControls(user: ReturnType<typeof userEvent.setup>) {
  const btn = screen.queryByRole('button', { name: ORCHESTRATION_UI_COPY.roadmapGanttToolbarMoreExpand });
  if (btn) await user.click(btn);
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
    const minimalPack: GlcOrchestrationPackView = {
      version: ORCHESTRATION_PACK_SCHEMA_VERSION,
      graph: { nodes: [], edges: [] },
      lanes: {} as GlcOrchestrationPackView['lanes'],
      critical_path: ['a'],
      conflicts_resolved: [],
      manifest_snapshot_id: 'snap-test',
      confidence_map: { node_confidence: { a: 'high' } },
    };
    apiMocks.downloadOrchestrationSprintExportCsvMock.mockResolvedValue('id,title\n');
    const packGetBody = {
      pack: minimalPack,
      orchestration_pack_version: 1,
      roadmap_version: 1,
      last_revision_diff: null,
      plan_governance: null,
    };
    apiMocks.getOrchestrationPackMock.mockResolvedValue(packGetBody);
    apiMocks.getOrchestrationPackConditionalMock.mockResolvedValue({ kind: 'ok' as const, data: packGetBody });
    apiMocks.getAuditTimelineMock.mockResolvedValue({
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
        milestones: [{ id: 'm1', label: 'Release gate', target_window_days: 5, unlocks: [] }],
        top_7d: [],
        top_30d: [],
        waiting_list_domains: [],
        data_gaps: null,
      },
    });
  });

  it('shows plan segmented nav for consultants with Roadmap selected', async () => {
    useProfileMock.mockReturnValue({ isClient: false });
    renderWithProviders(
      <MemoryRouter initialEntries={['/roadmap/audit-1']}>
        <Routes>
          <Route path="/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Roadmap timeline');

    const roadmap = screen.getByRole('tab', { name: /Execute/i });
    expect(roadmap).toHaveAttribute('href', '/roadmap/audit-1');

    const studioLink = screen.getByRole('link', {
      name: PLAN_WORKSPACE_UI_COPY.planWorkbenchConsultantPrimaryAriaLabel,
    });
    expect(studioLink).toHaveAttribute(
      'href',
      buildPlanWorkspaceHref({ auditId: 'audit-1', isClient: false, mode: 'shape' }),
    );
    expect(roadmap).toHaveAttribute('aria-selected', 'true');
  });

  it('shows mapper-empty guidance when lanes have rows but projection is empty', async () => {
    const spy = vi.spyOn(RoadmapMapper, 'buildRoadmapGanttProjection').mockReturnValue({
      lanes: [],
      tasks: [],
      dependencies: [],
      defaultTimeStart: 0,
      defaultTimeEnd: 1,
      milestones: [],
      upstreamByTask: new Map(),
      downstreamByTask: new Map(),
    });
    useProfileMock.mockReturnValue({ isClient: false });
    try {
      renderWithProviders(
        <MemoryRouter initialEntries={['/roadmap/audit-1']}>
          <Routes>
            <Route path="/roadmap/:id" element={<PortalRoadmapGanttPage />} />
            <Route path="/timeline/:id" element={<div>Timeline stub</div>} />
          </Routes>
        </MemoryRouter>,
      );
      expect(await screen.findByText(ORCHESTRATION_UI_COPY.planRoadmapMapperEmptyTasksTitle)).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: ORCHESTRATION_UI_COPY.planRoadmapOpenPrimaryPlanCta }),
      ).toHaveAttribute('href', buildAppRoute.plan('audit-1', 'board'));
    } finally {
      spy.mockRestore();
    }
  });

  it('renders roadmap schedule and opens task details', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const coreApiLabels = await screen.findAllByText('Core API');
    expect(coreApiLabels.length).toBeGreaterThan(0);
    expect(await screen.findByText('Roadmap timeline')).toBeInTheDocument();
    await user.click(coreApiLabels[0]!);
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText('tech_infrastructure')).toBeInTheDocument();
  });

  it('opens lane focus menu from timeline grid via M shortcut (keyboard path)', async () => {
    const user = userEvent.setup();
    useProfileMock.mockReturnValue({ isClient: false });
    renderWithProviders(
      <MemoryRouter initialEntries={['/roadmap/audit-1']}>
        <Routes>
          <Route path="/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const grid = await screen.findByTestId('roadmap-timeline-grid');
    const coreBar = grid.querySelector('[data-roadmap-task-id="a"]') as HTMLElement | null;
    expect(coreBar).not.toBeNull();
    await user.click(coreBar!);

    coreBar!.focus();
    await user.keyboard('m');

    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', {
        name: ORCHESTRATION_LANE_LABELS.tech_delivery,
      }),
    ).toBeInTheDocument();
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
    await user.click(screen.getByRole('tab', { name: ORCHESTRATION_UI_COPY.roadmapGanttMainTabDependenciesLabel }));
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

    await screen.findByText('Roadmap timeline');
    await expandRoadmapMoreControls(user);
    const filter = await screen.findByLabelText('Dependency type');
    await user.selectOptions(filter, 'SS');
    await user.click(screen.getByRole('tab', { name: ORCHESTRATION_UI_COPY.roadmapGanttMainTabDependenciesLabel }));
    await user.click(screen.getByRole('tab', { name: ORCHESTRATION_UI_COPY.roadmapGanttDepsTableTabLabel }));
    expect(await screen.findByText('No dependencies match current filters. Clear filters.')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: ORCHESTRATION_UI_COPY.roadmapGanttMainTabTimelineLabel }));
    await expandRoadmapMoreControls(user);
    await user.selectOptions(screen.getByLabelText('Dependency type'), 'FS');
    await user.click(screen.getByRole('tab', { name: ORCHESTRATION_UI_COPY.roadmapGanttMainTabDependenciesLabel }));
    await user.click(screen.getByRole('tab', { name: ORCHESTRATION_UI_COPY.roadmapGanttDepsTableTabLabel }));
    expect(await screen.findByText('Finish -> Start')).toBeInTheDocument();
  }, 15000);

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
    await user.click(screen.getByRole('tab', { name: ORCHESTRATION_UI_COPY.roadmapGanttMainTabDependenciesLabel }));
    await user.click(screen.getByRole('tab', { name: ORCHESTRATION_UI_COPY.roadmapGanttDepsTableTabLabel }));
    const typeHeader = screen.getByRole('button', { name: /^Type/ });
    await user.click(typeHeader);

    const sortedTypeHeader = screen.getByRole('button', { name: /Type (▲|▼)/ });
    expect(sortedTypeHeader).toBeInTheDocument();
  }, 15000);

  it('shows day horizon controls in day scale and hides them in month scale', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Roadmap timeline');
    await expandRoadmapMoreControls(user);

    const dayHorizonGroup = await screen.findByRole('group', { name: ORCHESTRATION_UI_COPY.roadmapGanttHorizonAriaLabel });
    expect(within(dayHorizonGroup).getByRole('button', { name: '30d' })).toBeInTheDocument();
    const range60 = within(dayHorizonGroup).getByRole('button', { name: '60d' });
    expect(range60).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(dayHorizonGroup).getByRole('button', { name: '90d' }));
    expect(within(dayHorizonGroup).getByRole('button', { name: '90d' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: ORCHESTRATION_UI_COPY.roadmapGanttScaleMonthsToggle }));
    expect(screen.queryByRole('group', { name: ORCHESTRATION_UI_COPY.roadmapGanttHorizonAriaLabel })).not.toBeInTheDocument();
  });

  it('restores timeline scale and day horizon from localStorage', async () => {
    const user = userEvent.setup();
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

    await screen.findByText('Roadmap timeline');
    await expandRoadmapMoreControls(user);

    const dayHorizonGroup = await screen.findByRole('group', { name: ORCHESTRATION_UI_COPY.roadmapGanttHorizonAriaLabel });
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

    await screen.findByRole('tab', { name: ORCHESTRATION_UI_COPY.roadmapGanttMainTabDependenciesLabel });
    expect(screen.getByRole('tab', { name: ORCHESTRATION_UI_COPY.roadmapGanttMainTabDependenciesLabel })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: ORCHESTRATION_UI_COPY.roadmapGanttDepsTableTabLabel })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: ORCHESTRATION_UI_COPY.roadmapGanttMainTabTimelineLabel }));
    const scaleGroup = screen.getByRole('group', { name: ORCHESTRATION_UI_COPY.roadmapGanttScaleAriaLabel });
    expect(within(scaleGroup).getByText(ORCHESTRATION_UI_COPY.roadmapGanttScaleMonthsToggle)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('Density')).toHaveValue('compact');
    await expandRoadmapMoreControls(user);
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
    await expandRoadmapMoreControls(user);
    await user.click(screen.getByRole('button', { name: /^Advanced/ }));
    await user.selectOptions(screen.getByLabelText('Owner'), 'marketing_utp');
    const metricsQuick = await screen.findByTestId('roadmap-toolbar-metrics');
    expect(within(metricsQuick).getByText('Tasks 1')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Dependency view'), 'selected');
    expect(within(metricsQuick).getByText('Dependencies 0')).toBeInTheDocument();
    await expandRoadmapMoreControls(user);
    await user.click(screen.getByRole('checkbox', { name: 'Blocked only' }));
    expect(screen.getByRole('checkbox', { name: 'Blocked only' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(within(await screen.findByTestId('roadmap-toolbar-metrics')).getByText('Tasks 3')).toBeInTheDocument();
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

  it('shows critical path badge when opening a task on the pack critical path', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Roadmap timeline');
    await user.click(screen.getAllByText('Core API')[0]!);
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText(ORCHESTRATION_UI_COPY.roadmapGanttCriticalPathBadge)).toBeInTheDocument();
  });

  it('filters gantt items to critical-path tasks when Critical path only is enabled', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Roadmap timeline');
    await expandRoadmapMoreControls(user);
    const metrics = await screen.findByTestId('roadmap-toolbar-metrics');
    expect(within(metrics).getByText('Tasks 3')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Critical path only/i }));
    expect(within(metrics).getByText('Tasks 1')).toBeInTheDocument();
    expect(screen.queryByText('Launch campaign')).not.toBeInTheDocument();
  });

  it('renders milestone lane label and bar tooltip content on hover', async () => {
    const user = userEvent.setup();
    const view = renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Roadmap timeline');
    expect(screen.getByText(ORCHESTRATION_UI_COPY.roadmapGanttMilestonesLaneTitle)).toBeInTheDocument();

    const bars = view.container.querySelectorAll('.rct-item');
    const coreBar = [...bars].find((el) => el.textContent?.includes('Core API'));
    expect(coreBar).toBeTruthy();
    await user.hover(coreBar as HTMLElement);
    const tooltips = await screen.findAllByRole('tooltip');
    const taskTip = tooltips.find((el) => el.textContent?.includes('Core API'));
    expect(taskTip).toBeTruthy();
    expect(taskTip?.textContent).toMatch(new RegExp(`${ORCHESTRATION_UI_COPY.roadmapGanttBlocksLabel}:\\s*\\d+`));
    expect(taskTip?.textContent).toContain(ORCHESTRATION_UI_COPY.roadmapGanttDurationDaysSuffix);
    expect(taskTip?.textContent).toContain(`${ORCHESTRATION_UI_COPY.roadmapGanttConfidenceTooltipPrefix}: high`);
  });

  it('adds cross-lane styling class to dependency arrows in the graph', async () => {
    const user = userEvent.setup();
    const view = renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Roadmap timeline');
    await user.click(screen.getByRole('tab', { name: ORCHESTRATION_UI_COPY.roadmapGanttMainTabDependenciesLabel }));
    await screen.findByText('Dependency graph');
    expect(view.container.querySelector('.roadmap-dependency-arrow-cross-lane')).not.toBeNull();
  });

  it('filters tasks by title search input', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Roadmap timeline');
    await expandRoadmapMoreControls(user);
    const metrics = await screen.findByTestId('roadmap-toolbar-metrics');
    expect(within(metrics).getByText('Tasks 3')).toBeInTheDocument();
    await user.type(screen.getByLabelText(ORCHESTRATION_UI_COPY.roadmapGanttSearchAriaLabel), 'launch');
    expect(within(metrics).getByText('Tasks 1')).toBeInTheDocument();
  });

  it('restores title filter from URL query q', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1?q=Core']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Roadmap timeline');
    await expandRoadmapMoreControls(user);
    expect(screen.getByLabelText(ORCHESTRATION_UI_COPY.roadmapGanttSearchAriaLabel)).toHaveValue('Core');
    const metrics = await screen.findByTestId('roadmap-toolbar-metrics');
    expect(within(metrics).getByText('Tasks 1')).toBeInTheDocument();
  });

  it('calls sprint CSV export API when download button is clicked', async () => {
    const user = userEvent.setup();
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Roadmap timeline');
    await expandRoadmapMoreControls(user);
    await user.click(screen.getByRole('button', { name: ORCHESTRATION_UI_COPY.sprintExportCsvCta }));
    expect(apiMocks.downloadOrchestrationSprintExportCsvMock).toHaveBeenCalledWith('audit-1');
    anchorClickSpy.mockRestore();
  });

  it('shows weekend legend on day scale and hides it on month scale', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Roadmap timeline');
    await expandRoadmapMoreControls(user);
    expect(screen.getByText(ORCHESTRATION_UI_COPY.roadmapGanttWeekendLegendLabel)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: ORCHESTRATION_UI_COPY.roadmapGanttScaleMonthsToggle }));
    expect(screen.queryByText(ORCHESTRATION_UI_COPY.roadmapGanttWeekendLegendLabel)).not.toBeInTheDocument();
  });

  it('renders confidence dot on task bar when pack provides node_confidence', async () => {
    const view = renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Roadmap timeline');
    expect(view.container.querySelector('.roadmap-gantt-confidence-dot[data-level="high"]')).not.toBeNull();
  });



  it('downloads iCal via anchor click without calling backend', async () => {
    const user = userEvent.setup();
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Roadmap timeline');
    await expandRoadmapMoreControls(user);
    await user.click(screen.getByRole('button', { name: ORCHESTRATION_UI_COPY.roadmapGanttIcalExportCta }));
    expect(anchorClickSpy).toHaveBeenCalled();
    anchorClickSpy.mockRestore();
  });

  it('shows baseline saved label after Set baseline', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Roadmap timeline');
    await expandRoadmapMoreControls(user);
    await user.click(screen.getByRole('button', { name: ORCHESTRATION_UI_COPY.roadmapGanttBaselineSetCta }));
    expect(screen.getByText(new RegExp(ORCHESTRATION_UI_COPY.roadmapGanttBaselineTakenAtPrefix))).toBeInTheDocument();
  });

  it('includes schedule elapsed line in task tooltip when schedule progress is enabled', async () => {
    const user = userEvent.setup();
    const view = renderWithProviders(
      <MemoryRouter initialEntries={['/portal/roadmap/audit-1']}>
        <Routes>
          <Route path="/portal/roadmap/:id" element={<PortalRoadmapGanttPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Roadmap timeline');
    await expandRoadmapMoreControls(user);
    expect(screen.getByRole('checkbox', { name: ORCHESTRATION_UI_COPY.roadmapGanttScheduleProgressToggleLabel })).toBeChecked();
    const bars = view.container.querySelectorAll('.rct-item');
    const coreBar = [...bars].find((el) => el.textContent?.includes('Core API'));
    expect(coreBar).toBeTruthy();
    await user.hover(coreBar as HTMLElement);
    const tooltips = await screen.findAllByRole('tooltip');
    const taskTip = tooltips.find((el) => el.textContent?.includes('Core API'));
    expect(taskTip?.textContent).toContain(ORCHESTRATION_UI_COPY.roadmapGanttScheduleElapsedTooltipPrefix);
  });
});
