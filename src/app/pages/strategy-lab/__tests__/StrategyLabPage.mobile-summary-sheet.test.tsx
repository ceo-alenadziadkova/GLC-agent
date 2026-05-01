import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { ReactNode } from 'react';

import { ORCHESTRATION_LANE_LABELS } from '../../../config/orchestration-roadmap-ui-copy.en';
import { ORCHESTRATION_PACK_SCHEMA_VERSION } from '../../../config/orchestration-contract';
import { STRATEGY_LAB_COPY } from '../../../config/strategy-lab-copy';
import type { AuditState } from '../../../data/audit/contracts/state/audit-state.types';
import type { GlcOrchestrationPackView } from '../../../data/audit/contracts/report/orchestration-pack.types';

import { StrategyLab } from '../StrategyLabPage';
import { QueryClient, QueryClientProvider } from '../../../lib/tanstack-react-query';

const useAuditMock = vi.fn();
const reloadMock = vi.fn();

/** Mirrors `StrategyLab`: pack summary Sheet when `(max-width: 1023px)`; stacked main when `(max-width: 767px)`. */
const mobileState = vi.hoisted(() => ({ packSummaryStacked: false, narrowMobile: false }));

vi.mock('../StrategyLabOrchestrationPanel', () => ({
  StrategyLabOrchestrationPanel: () => <div data-testid="orchestration-panel-stub" />,
}));

vi.mock('../../../hooks/useAudit', () => ({
  useAudit: (...args: unknown[]) => useAuditMock(...args),
}));

vi.mock('../../../hooks/useProfile', () => ({
  useProfile: () => ({ isClient: false }),
}));

vi.mock('../../../hooks/useBrowserOnline', () => ({
  useBrowserOnline: () => true,
}));

vi.mock('../../../hooks/useMediaQuery', () => ({
  useMediaQuery: (q: string) => {
    const s = String(q);
    if (s.includes(String(1024 - 1))) return mobileState.packSummaryStacked;
    if (s.includes(String(768 - 1))) return mobileState.narrowMobile;
    return false;
  },
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
    manifest_snapshot_id: 'snap-mobile-sheet-test',
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

function buildAuditWithPack(): AuditState {
  return {
    meta: {
      id: 'audit-mobile-sheet',
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
      audit_id: 'audit-mobile-sheet',
      status: 'complete',
      executive_summary: null,
      overall_score: null,
      quick_wins: [],
      medium_term: [],
      strategic: [],
      scorecard: [],
      effective_constraints: {
        company_stage: 'growth',
        budget_band: 'medium',
        team_scale: 'small',
      },
      glc_orchestration_pack: buildMinimalPack(),
      orchestration_pack_version: 2,
    },
    reviews: [],
    brief: null,
  };
}

function renderLab(initialEntries: readonly string[]) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[...initialEntries]}>
        <Routes>
          <Route path="strategy/:id" element={<StrategyLab />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('StrategyLab mobile plan summary Sheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mobileState.packSummaryStacked = false;
    mobileState.narrowMobile = false;
    useAuditMock.mockReturnValue({
      audit: buildAuditWithPack(),
      loading: false,
      error: null,
      reload: reloadMock,
      isFetching: false,
    });
  });

  it('shows a resizable handle on desktop instead of the mobile summary drawer trigger', () => {
    mobileState.packSummaryStacked = false;
    mobileState.narrowMobile = false;

    renderLab(['/strategy/audit-mobile-sheet']);

    expect(screen.getByRole('separator', { name: STRATEGY_LAB_COPY.panel.resizeHandle })).toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: new RegExp(STRATEGY_LAB_COPY.panel.summaryDrawerTriggerLabel, 'i') }),
    ).toBeNull();
  });

  it('shows the Sheet trigger instead of resize on stacked-layout consultants with a saved pack', () => {
    mobileState.packSummaryStacked = true;

    renderLab(['/strategy/audit-mobile-sheet']);

    expect(screen.queryByRole('separator', { name: STRATEGY_LAB_COPY.panel.resizeHandle })).toBeNull();

    expect(
      screen.getByRole('button', { name: new RegExp(STRATEGY_LAB_COPY.panel.summaryDrawerTriggerLabel, 'i') }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the Sheet when the sticky trigger is pressed', async () => {
    mobileState.packSummaryStacked = true;
    const user = userEvent.setup();

    renderLab(['/strategy/audit-mobile-sheet']);

    await user.click(
      screen.getByRole('button', { name: new RegExp(STRATEGY_LAB_COPY.panel.summaryDrawerTriggerLabel, 'i') }),
    );

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    expect(screen.getAllByRole('heading', { name: STRATEGY_LAB_COPY.panel.summaryDrawerTitle }).length).toBeGreaterThan(0);

    /** Close affordance baked into SheetContent */
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('auto-opens the Sheet on stacked-layout when URL already selects a node', async () => {
    mobileState.packSummaryStacked = true;

    renderLab(['/strategy/audit-mobile-sheet?node=node-main']);

    const sheet = await screen.findByRole('dialog');
    expect(sheet).toBeInTheDocument();

    /** Detail card renders inside the sheet immediately after opening with a resolved node selection. */
    expect(within(sheet).getByText(/Main node/i)).toBeInTheDocument();
  });
});
