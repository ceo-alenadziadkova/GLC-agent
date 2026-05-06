import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '../../../../lib/tanstack-react-query';

import { PLAN_WORKSPACE_UI_COPY } from '../../../../config/plan-workspace-ui-copy.en';
import { PlanTableSurface } from '../PlanTableSurface';

vi.mock('../../../../components/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div data-testid="app-shell-mock">{children}</div>,
}));

const orchestrationValue = {
  auditId: 'audit-table',
  audit: null,
  auditLoading: true,
  auditError: null,
  reloadAudit: vi.fn(),
  timelineQuery: { isPending: false, isError: false, data: undefined },
  packQuery: { isPending: false, isError: false, data: undefined },
  includeTimelineFetch: false,
};

vi.mock('../../PortalPlanOrchestrationProvider', () => ({
  usePortalPlanOrchestration: () => orchestrationValue,
}));

vi.mock('../../../../hooks/useProfile', () => ({
  useProfile: () => ({ isClient: false }),
}));

vi.mock('../../../../data/api/plan-board-queries', () => ({
  usePlanBoardQuery: () => ({ data: undefined, isPending: true }),
  usePatchPlanBoardCardMutation: () => ({ mutateAsync: vi.fn() }),
}));

describe('PlanTableSurface', () => {
  it('shows loading copy while audit is loading', () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/plan/audit-table?view=table']}>
          <Routes>
            <Route path="/plan/:id" element={<PlanTableSurface />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText(PLAN_WORKSPACE_UI_COPY.loadingHeadline)).toBeInTheDocument();
  });
});
