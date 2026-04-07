import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { AuditState } from '../../data/auditTypes';
import { ClientAuditView } from '../ClientAuditView';
import { ClientPortalPipelineProvider } from '../../context/ClientPortalPipelineContext';
import * as apiService from '../../data/apiService';

vi.mock('../../components/AppShell', () => ({
  AppShell: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div data-testid="app-shell">
      {title ? <span data-testid="shell-title">{title}</span> : null}
      {children}
    </div>
  ),
}));

function minimalCompletedFullAudit(id: string): AuditState {
  return {
    meta: {
      id,
      user_id: 'user-1',
      client_id: null,
      company_url: 'https://example.com',
      company_name: 'Example Co',
      industry: null,
      status: 'completed',
      current_phase: 8,
      overall_score: 4,
      product_mode: 'full',
      token_budget: 100_000,
      tokens_used: 50_000,
      snapshot_token: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
    recon: null,
    domains: {},
    strategy: null,
    reviews: [],
    brief: null,
  };
}

function renderClientAuditRoute(auditId: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/portal/audit/${auditId}`]}>
        <ClientPortalPipelineProvider>
          <Routes>
            <Route path="/portal/audit/:id" element={<ClientAuditView />} />
          </Routes>
        </ClientPortalPipelineProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ClientAuditView', () => {
  let getAuditSpy: ReturnType<typeof vi.spyOn<typeof apiService.api, 'getAudit'>>;

  beforeEach(() => {
    vi.clearAllMocks();
    getAuditSpy = vi.spyOn(apiService.api, 'getAudit').mockImplementation(async (id: string) =>
      minimalCompletedFullAudit(id),
    );
  });

  afterEach(() => {
    getAuditSpy.mockRestore();
  });

  it('calls getAudit exactly once per mount (no duplicate fetch from removed wrapper)', async () => {
    renderClientAuditRoute('audit-xyz-1');

    await waitFor(() => {
      expect(screen.getByText('View your report')).toBeInTheDocument();
    });

    expect(getAuditSpy).toHaveBeenCalledTimes(1);
    expect(getAuditSpy).toHaveBeenCalledWith('audit-xyz-1');
  });

  it('shows friendly copy for 404 from getAudit', async () => {
    getAuditSpy.mockRejectedValue(new apiService.ApiError('Not found', 404));

    renderClientAuditRoute('missing-audit');

    await waitFor(() => {
      expect(screen.getByText('We could not find this audit.')).toBeInTheDocument();
    });

    expect(getAuditSpy).toHaveBeenCalledTimes(1);
  });

});
