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
    manifest_snapshot_id: 'snap-orchestrator-tabs',
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
  const pack = buildMinimalPack();
  return {
    meta: {
      id: 'audit-orchestrator-tabs',
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
      audit_id: 'audit-orchestrator-tabs',
      status: 'complete',
      executive_summary: null,
      overall_score: null,
      quick_wins: [
        {
          id: 'q1',
          title: 'Quick initiative',
          description: 'Desc',
          impact: 'high',
          effort: 'low',
        },
      ],
      medium_term: [],
      strategic: [],
      scorecard: [],
      glc_orchestration_pack: pack,
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
      <MemoryRouter initialEntries={['/strategy/audit-orchestrator-tabs']}>
        <Routes>
          <Route path="strategy/:id" element={<StrategyLab />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('StrategyLab orchestrator tablist a11y', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuditMock.mockReturnValue({
      audit: buildAuditWithPack(),
      loading: false,
      error: null,
      reload: reloadMock,
      isFetching: false,
    });
  });

  it('binds each tab to the tabpanel via aria-controls and updates aria-labelledby when switching tabs', async () => {
    const user = userEvent.setup();
    renderLab();

    const tablist = screen.getByRole('tablist', { name: STRATEGY_LAB_COPY.orchestratorTabs.tablistAriaLabel });
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('id', 'strategy-lab-orchestrator-panel');

    const nowTab = within(tablist).getByRole('tab', { name: new RegExp(STRATEGY_LAB_COPY.orchestratorTabs.now, 'i') });
    expect(nowTab).toHaveAttribute('aria-selected', 'true');
    expect(nowTab).toHaveAttribute('aria-controls', 'strategy-lab-orchestrator-panel');
    expect(panel).toHaveAttribute('aria-labelledby', 'strategy-lab-orchestrator-tab-now');

    const risksTab = within(tablist).getByRole('tab', { name: new RegExp(STRATEGY_LAB_COPY.orchestratorTabs.risks, 'i') });
    await user.click(risksTab);
    expect(risksTab).toHaveAttribute('aria-selected', 'true');
    expect(panel).toHaveAttribute('aria-labelledby', 'strategy-lab-orchestrator-tab-risks');
  });
});
