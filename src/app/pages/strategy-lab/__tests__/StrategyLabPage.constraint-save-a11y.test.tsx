import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { ReactNode } from 'react';

import { STRATEGY_LAB_COPY } from '../../../config/strategy-lab-copy';
import type { AuditState } from '../../../data/audit/contracts/state/audit-state.types';
import { StrategyLab } from '../StrategyLabPage';
import { QueryClient, QueryClientProvider } from '../../../lib/tanstack-react-query';
import { ApiError } from '../../../data/api-error';

const useAuditMock = vi.fn();
const reloadMock = vi.fn();
const patchStrategyLabContextMock = vi.hoisted(() => vi.fn());

const profileState = vi.hoisted(() => ({ isClient: false }));

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
      patchStrategyLabContext: patchStrategyLabContextMock,
      getLatestSnapshot: vi.fn().mockResolvedValue(null),
    },
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function buildAuditBase(): AuditState {
  return {
    meta: {
      id: 'audit-constraints-a11y',
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
      audit_id: 'audit-constraints-a11y',
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
      <MemoryRouter initialEntries={['/strategy/audit-constraints-a11y']}>
        <Routes>
          <Route path="strategy/:id" element={<StrategyLab />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('StrategyLab constraint overrides save accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profileState.isClient = false;
    patchStrategyLabContextMock.mockRejectedValue(new Error('offline'));
    useAuditMock.mockReturnValue({
      audit: buildAuditBase(),
      loading: false,
      error: null,
      reload: reloadMock,
      isFetching: false,
    });
  });

  it('announces PATCH failure via polite aria-live status and clears on dismiss', async () => {
    const user = userEvent.setup();
    renderLab();

    await user.click(screen.getByRole('button', { name: new RegExp(STRATEGY_LAB_COPY.referenceDisclosure.summary, 'i') }));
    await user.click(screen.getByRole('button', { name: STRATEGY_LAB_COPY.constraints.save }));

    const statusRegion = await screen.findByRole('status');
    expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    expect(statusRegion).toHaveAttribute('aria-atomic', 'true');
    expect(within(statusRegion).getByText(STRATEGY_LAB_COPY.constraints.saveFailed)).toBeInTheDocument();

    await user.click(within(statusRegion).getByRole('button', { name: STRATEGY_LAB_COPY.constraints.dismissSaveError }));

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('includes API detail text in the live region when the server sends one', async () => {
    patchStrategyLabContextMock.mockRejectedValue(
      new ApiError('bad', 400, 'BAD', { detail: 'Rate limited' }),
    );
    const user = userEvent.setup();
    renderLab();

    await user.click(screen.getByRole('button', { name: new RegExp(STRATEGY_LAB_COPY.referenceDisclosure.summary, 'i') }));
    await user.click(screen.getByRole('button', { name: STRATEGY_LAB_COPY.constraints.save }));

    const statusRegion = await screen.findByRole('status');
    expect(within(statusRegion).getByText(/Rate limited/)).toBeInTheDocument();
  });
});
