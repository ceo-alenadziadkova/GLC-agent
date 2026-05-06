import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { ReactNode } from 'react';

import { ORCHESTRATION_LANE_LABELS } from '../../../config/orchestration-roadmap-ui-copy.en';
import { ORCHESTRATION_PACK_SCHEMA_VERSION } from '../../../config/orchestration-contract';
import { primaryPlanWorkbenchViewForStrategyLinks } from '../../../config/plan-delivery-board-ui';
import { STRATEGY_LAB_COPY } from '../../../config/strategy-lab-copy';
import type { AuditState } from '../../../data/audit/contracts/state/audit-state.types';
import type { GlcOrchestrationPackView } from '../../../data/audit/contracts/report/orchestration-pack.types';

import { StrategyLab } from '../StrategyLabPage';
import { QueryClient, QueryClientProvider } from '../../../lib/tanstack-react-query';
import { buildPlanWorkspaceHref } from '../../../lib/plan-cross-nav';

const useAuditMock = vi.fn();
const reloadMock = vi.fn();

const profileState = vi.hoisted(() => ({ isClient: false }));
const featureFlagOverrides = vi.hoisted(() => ({ clientOrchestrationLabReadOnlyEnabled: true }));

vi.mock('../../../config/app-feature-flags', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../../config/app-feature-flags')>();
  return {
    APP_FEATURE_FLAGS: new Proxy(mod.APP_FEATURE_FLAGS, {
      get(target, prop, receiver) {
        if (prop === 'clientOrchestrationLabReadOnlyEnabled') {
          return featureFlagOverrides.clientOrchestrationLabReadOnlyEnabled;
        }
        return Reflect.get(target, prop, receiver);
      },
    }),
  };
});

vi.mock('../StrategyLabOrchestrationPanel', () => ({
  StrategyLabOrchestrationPanel: () => <div data-testid="orchestration-panel-stub" />,
}));

vi.mock('../../../hooks/useAudit', () => ({
  useAudit: (...args: unknown[]) => useAuditMock(...args),
}));

vi.mock('../../../hooks/useProfile', () => ({
  useProfile: () => ({ isClient: profileState.isClient }),
}));

vi.mock('../../../hooks/useBrowserOnline', () => ({
  useBrowserOnline: () => true,
}));

vi.mock('../../../hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn(() => false),
}));

vi.mock('../../../components/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div data-testid="app-shell">{children}</div>,
}));

vi.mock('../../../data/apiService', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../data/apiService')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getLatestSnapshot: vi.fn().mockResolvedValue(null),
    },
  };
});

function buildMinimalPack(): GlcOrchestrationPackView {
  const laneKeys = Object.keys(ORCHESTRATION_LANE_LABELS) as Array<keyof typeof ORCHESTRATION_LANE_LABELS>;
  const lanes = Object.fromEntries(laneKeys.map(k => [k, k === 'tech_delivery' ? ['node-main'] : []])) as NonNullable<
    GlcOrchestrationPackView['lanes']
  >;
  return {
    version: ORCHESTRATION_PACK_SCHEMA_VERSION,
    manifest_snapshot_id: 'snap-steps-strip-test',
    critical_path: ['node-main'],
    conflicts_resolved: [],
    graph: {
      nodes: [
        {
          id: 'node-main',
          title: 'Main node',
          domain: 'tech_infrastructure',
          lane: 'tech_delivery',
          source: 'strategy',
          analysis_depth: 'baseline',
        },
      ],
      edges: [],
    },
    lanes,
  };
}

function buildAuditBase(): AuditState {
  return {
    meta: {
      id: 'audit-steps-strip',
      user_id: 'user-1',
      client_id: null,
      company_url: 'https://example.com',
      company_name: 'Example Co',
      industry: 'all',
      status: 'complete',
      current_phase: 7,
      overall_score: 4,
      product_mode: 'full',
      execution_plan: {
        selected_domains: ['tech_infrastructure'],
        depth: 'standard',
        source: 'user_selected',
      },
      token_budget: 1000,
      tokens_used: 0,
      snapshot_token: null,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
    recon: null,
    domains: {},
    strategy: {
      id: 'strategy-1',
      audit_id: 'audit-steps-strip',
      status: 'complete',
      executive_summary: null,
      overall_score: null,
      quick_wins: [],
      medium_term: [],
      strategic: [],
      scorecard: [],
    },
    reviews: [],
    brief: null,
  };
}

function renderLab() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/strategy/audit-steps-strip']}>
        <Routes>
          <Route path="strategy/:id" element={<StrategyLab />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('StrategyLab steps strip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profileState.isClient = false;
    featureFlagOverrides.clientOrchestrationLabReadOnlyEnabled = true;
  });

  it('renders planning journey navigation for consultants (no duplicate in-page phase nav)', () => {
    useAuditMock.mockReturnValue({
      audit: buildAuditBase(),
      loading: false,
      error: null,
      reload: reloadMock,
      isFetching: false,
    });

    renderLab();

    expect(screen.getByRole('navigation', { name: STRATEGY_LAB_COPY.journeyStrip.ariaLabel })).toBeInTheDocument();
  });

  it('renders consultant workbench segmented navigation with orchestration selected', () => {
    useAuditMock.mockReturnValue({
      audit: buildAuditBase(),
      loading: false,
      error: null,
      reload: reloadMock,
      isFetching: false,
    });

    renderLab();

    const wb = screen.getByRole('navigation', { name: STRATEGY_LAB_COPY.workbenchSegment.ariaLabel });
    const wbLinks = within(wb).getAllByRole('link');
    expect(wbLinks).toHaveLength(2);

    const orchestration = within(wb).getByRole('link', {
      name: STRATEGY_LAB_COPY.workbenchSegment.orchestrationLabel,
    });
    const roadmap = within(wb).getByRole('link', {
      name: STRATEGY_LAB_COPY.workbenchSegment.planLabel,
    });
    expect(orchestration).toHaveAttribute(
      'href',
      buildPlanWorkspaceHref({ auditId: 'audit-steps-strip', isClient: false, mode: 'shape' }),
    );
    expect(roadmap).toHaveAttribute(
      'href',
      buildPlanWorkspaceHref({
        auditId: 'audit-steps-strip',
        isClient: false,
        mode: 'execute',
        view: primaryPlanWorkbenchViewForStrategyLinks(),
      }),
    );
    expect(orchestration).toHaveAttribute('aria-current', 'page');
    expect(roadmap).not.toHaveAttribute('aria-current');
  });

  it('renders four journey step links and marks step 1 as current when no progress yet', () => {
    useAuditMock.mockReturnValue({
      audit: buildAuditBase(),
      loading: false,
      error: null,
      reload: reloadMock,
      isFetching: false,
    });

    renderLab();

    const nav = screen.getByRole('navigation', { name: STRATEGY_LAB_COPY.journeyStrip.ariaLabel });
    const items = within(nav).getAllByRole('listitem');
    expect(items).toHaveLength(4);

    const links = within(nav).getAllByRole('link');
    expect(links).toHaveLength(4);
    expect(links[0]).toHaveAttribute(
      'href',
      buildPlanWorkspaceHref({ auditId: 'audit-steps-strip', isClient: false, mode: 'define' }),
    );
    expect(links[1]).toHaveAttribute(
      'href',
      buildPlanWorkspaceHref({ auditId: 'audit-steps-strip', isClient: false, mode: 'shape' }),
    );
    expect(links[2]).toHaveAttribute(
      'href',
      buildPlanWorkspaceHref({ auditId: 'audit-steps-strip', isClient: false, mode: 'shape' }),
    );
    expect(links[3]).toHaveAttribute(
      'href',
      buildPlanWorkspaceHref({
        auditId: 'audit-steps-strip',
        isClient: false,
        mode: 'execute',
        view: primaryPlanWorkbenchViewForStrategyLinks(),
      }),
    );
    expect(links[0]).toHaveAttribute('aria-current', 'step');
    expect(links[1]).not.toHaveAttribute('aria-current');
    expect(links[2]).not.toHaveAttribute('aria-current');
    expect(links[3]).not.toHaveAttribute('aria-current');

    expect(within(nav).getByText(STRATEGY_LAB_COPY.journeyStrip.step1Title)).toBeInTheDocument();
    expect(within(nav).getByText(STRATEGY_LAB_COPY.journeyStrip.step2Title)).toBeInTheDocument();
    expect(within(nav).getByText(STRATEGY_LAB_COPY.journeyStrip.step3Title)).toBeInTheDocument();
    expect(within(nav).getByText(STRATEGY_LAB_COPY.journeyStrip.step4Title)).toBeInTheDocument();
  });

  it('marks Plan as current when context, manifest and pack are satisfied', () => {
    const audit = buildAuditBase();
    audit.strategy = {
      ...audit.strategy!,
      effective_constraints: {
        company_stage: 'growth',
        budget_band: 'medium',
        team_scale: 'small',
      },
      glc_orchestration_pack: buildMinimalPack(),
      orchestration_pack_version: 2,
    };

    useAuditMock.mockReturnValue({
      audit,
      loading: false,
      error: null,
      reload: reloadMock,
      isFetching: false,
    });

    renderLab();

    const nav = screen.getByRole('navigation', { name: STRATEGY_LAB_COPY.journeyStrip.ariaLabel });
    const links = within(nav).getAllByRole('link');
    expect(links).toHaveLength(4);
    expect(links[3]).toHaveAttribute('aria-current', 'step');
    expect(links[0]).not.toHaveAttribute('aria-current');
    expect(links[1]).not.toHaveAttribute('aria-current');
    expect(links[2]).not.toHaveAttribute('aria-current');
  });

  it('updates orchestrator tabpanel polite status when switching tabs', async () => {
    const user = userEvent.setup();
    const audit = buildAuditBase();
    audit.strategy = {
      ...audit.strategy!,
      effective_constraints: {
        company_stage: 'growth',
        budget_band: 'medium',
        team_scale: 'small',
      },
      glc_orchestration_pack: buildMinimalPack(),
      orchestration_pack_version: 2,
    };

    useAuditMock.mockReturnValue({
      audit,
      loading: false,
      error: null,
      reload: reloadMock,
      isFetching: false,
    });

    renderLab();

    const orchPanel = document.getElementById('strategy-lab-orchestrator-panel');
    expect(orchPanel).toBeTruthy();
    const live = orchPanel!.querySelector('[aria-live="polite"]');
    expect(live).toBeTruthy();
    const expectedNext = STRATEGY_LAB_COPY.orchestratorTabs.tabPanelStatusTemplate
      .replace('{title}', STRATEGY_LAB_COPY.orchestratorTabs.next)
      .replace('{desc}', STRATEGY_LAB_COPY.orchestratorTabs.nextDesc);
    await user.click(screen.getByRole('tab', { name: new RegExp(STRATEGY_LAB_COPY.orchestratorTabs.next, 'i') }));
    expect(live!.textContent).toBe(expectedNext);
  });

  it('shows the journey strip for client portal profiles when read-only orchestration lab is enabled', () => {
    profileState.isClient = true;
    useAuditMock.mockReturnValue({
      audit: buildAuditBase(),
      loading: false,
      error: null,
      reload: reloadMock,
      isFetching: false,
    });

    renderLab();

    expect(screen.getByRole('navigation', { name: STRATEGY_LAB_COPY.journeyStrip.ariaLabel })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: STRATEGY_LAB_COPY.workbenchSegment.ariaLabel })).toBeNull();
  });

  it('hides the journey strip for client portal when client orchestration read-only lab flag is off', () => {
    profileState.isClient = true;
    featureFlagOverrides.clientOrchestrationLabReadOnlyEnabled = false;
    useAuditMock.mockReturnValue({
      audit: buildAuditBase(),
      loading: false,
      error: null,
      reload: reloadMock,
      isFetching: false,
    });

    renderLab();

    expect(screen.queryByRole('navigation', { name: STRATEGY_LAB_COPY.journeyStrip.ariaLabel })).toBeNull();
  });

  it('renders the reference area as an accordion with always-visible preview line and no native <details>', () => {
    useAuditMock.mockReturnValue({
      audit: buildAuditBase(),
      loading: false,
      error: null,
      reload: reloadMock,
      isFetching: false,
    });

    const { container } = renderLab();

    // Accordion trigger keeps the section title and exposes a preview summary so consultants
    // know what is hidden inside (benchmarks count + constraint state) without expanding.
    const referenceTrigger = screen.getByRole('button', {
      name: new RegExp(STRATEGY_LAB_COPY.referenceDisclosure.summary, 'i'),
    });
    expect(referenceTrigger).toHaveAttribute('aria-expanded', 'false');

    const expectedBenchmarksPreview = STRATEGY_LAB_COPY.referenceDisclosure.previewBenchmarks
      .replace('{available}', '0')
      .replace('{total}', '6');
    expect(referenceTrigger.textContent ?? '').toContain(expectedBenchmarksPreview);
    expect(referenceTrigger.textContent ?? '').toContain(
      STRATEGY_LAB_COPY.referenceDisclosure.previewConstraintsUnknown,
    );

    // Strategy Lab consultant IA must not rely on native <details>; everything goes through
    // the accordion primitive so a11y / preview-summary contract is consistent.
    expect(container.querySelectorAll('details')).toHaveLength(0);
  });

  it('renders constraints-from-brief preview when effective constraints exist without overrides', () => {
    const audit = buildAuditBase();
    audit.strategy = {
      ...audit.strategy!,
      effective_constraints: {
        company_stage: 'growth',
        budget_band: 'medium',
        team_scale: 'small',
      },
    };

    useAuditMock.mockReturnValue({
      audit,
      loading: false,
      error: null,
      reload: reloadMock,
      isFetching: false,
    });

    renderLab();

    const referenceTrigger = screen.getByRole('button', {
      name: new RegExp(STRATEGY_LAB_COPY.referenceDisclosure.summary, 'i'),
    });
    const previewFragment = STRATEGY_LAB_COPY.referenceDisclosure.previewConstraintsFromBrief
      .replace('{summary}', '')
      .trim();
    expect(referenceTrigger.textContent ?? '').toContain(previewFragment);
    expect(referenceTrigger.textContent ?? '').not.toContain(
      STRATEGY_LAB_COPY.referenceDisclosure.previewConstraintsOverridden.replace('{summary}', '').trim(),
    );
  });
});
