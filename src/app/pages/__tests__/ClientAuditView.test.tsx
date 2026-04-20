import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { AuditState, IntakeBrief } from '../../data/auditTypes';
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
    strategy: {
      id: 'strategy-1',
      audit_id: id,
      status: 'completed',
      executive_summary: null,
      overall_score: 4,
      quick_wins: [],
      medium_term: [],
      strategic: [],
      scorecard: [],
    },
    reviews: [],
    brief: null,
  };
}

function minimalCreatedAudit(id: string): AuditState {
  return {
    meta: {
      id,
      user_id: 'user-1',
      client_id: 'client-1',
      company_url: 'https://example.com',
      company_name: 'Example Co',
      industry: 'SaaS',
      status: 'created',
      current_phase: 0,
      overall_score: null,
      product_mode: 'full',
      token_budget: 100_000,
      tokens_used: 0,
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

function minimalCompletedFreeSnapshotAudit(id: string): AuditState {
  return {
    meta: {
      id,
      user_id: 'user-1',
      client_id: 'client-1',
      company_url: 'https://example.com',
      company_name: 'Example Co',
      industry: null,
      status: 'completed',
      current_phase: 0,
      overall_score: null,
      product_mode: 'free_snapshot',
      execution_plan: {
        selected_domains: ['ux_conversion'],
        depth: 'light',
        source: 'system_default',
        coverage_package: 'starter',
        include_strategy: false,
      },
      token_budget: 0,
      tokens_used: 0,
      snapshot_token: 'snap-1',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
    recon: {
      id: 'recon-1',
      audit_id: id,
      status: 'completed',
      company_name: 'Example Co',
      industry: null,
      location: null,
      languages: [],
      tech_stack: {},
      social_profiles: {},
      contact_info: { emails: [], phones: [], addresses: [] },
      pages_crawled: [],
      brief: null,
      interview_answers: null,
    },
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

const mockIntakeBrief: IntakeBrief = {
  id: 'brief-1',
  audit_id: 'audit-xyz-1',
  responses: {},
  status: 'draft',
  layer_completed: 0,
  collected_by: 'client',
  collection_mode: 'self_serve',
  data_quality_score: 0,
  sla_met: false,
  answered_required: 0,
  answered_recommended: 0,
  answered_optional: 0,
  total_required: 1,
  total_recommended: 0,
  total_optional: 0,
  recon_prefills: {},
  recon_conflicts: [],
  post_audit_questions: [],
  progress_pct: 0,
  readiness_badge: 'low',
  next_best_action: 'complete_required',
  responses_format: 2,
  intake_versions: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

describe('ClientAuditView', () => {
  let getAuditSpy: ReturnType<typeof vi.spyOn>;
  let getBriefSpy: ReturnType<typeof vi.spyOn>;
  let upgradeSpy: ReturnType<typeof vi.spyOn>;
  let requestHelpSpy: ReturnType<typeof vi.spyOn>;
  let startPipelineSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    getAuditSpy = vi.spyOn(apiService.api, 'getAudit').mockImplementation(async (id: string) =>
      minimalCompletedFullAudit(id),
    );
    getBriefSpy = vi.spyOn(apiService.api, 'getBrief').mockResolvedValue({
      product_mode: 'full',
      brief: mockIntakeBrief,
      questions: [],
      validation: {
        passed: false,
        sla_met: false,
        answered_required: 0,
        total_required: 1,
        answered_recommended: 0,
        total_recommended: 0,
        missing_required: [],
      },
      gates: {
        canStartSnapshot: false,
        canStartExpress: false,
        canStartFull: false,
        canStartPipeline: false,
        missingRequiredIds: ['a1'],
        recommendedToImproveIds: [],
        intakeProgress: {
          progressPct: 0,
          readinessBadge: 'low',
          nextBestAction: 'complete_required',
        },
      },
      intakeProgress: {
        progressPct: 0,
        readinessBadge: 'low',
        nextBestAction: 'complete_required',
      },
    });
    upgradeSpy = vi.spyOn(apiService.api, 'upgradeAuditFromSnapshot').mockResolvedValue({
      ok: true,
      snapshot_scrape_limited: false,
      snapshot_scrape_robots_blocked: false,
    });
    requestHelpSpy = vi.spyOn(apiService.api, 'requestBriefHelp').mockResolvedValue(undefined);
    startPipelineSpy = vi.spyOn(apiService.api, 'startPipeline').mockResolvedValue(undefined);
  });

  afterEach(() => {
    getAuditSpy.mockRestore();
    getBriefSpy.mockRestore();
    upgradeSpy.mockRestore();
    requestHelpSpy.mockRestore();
    startPipelineSpy.mockRestore();
  });

  it('renders missing-id message when route param is absent', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/portal/audit']}>
          <Routes>
            <Route path="/portal/audit" element={<ClientAuditView />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Missing id.')).toBeInTheDocument();
  });

  it('calls getAudit exactly once per mount (no duplicate fetch from removed wrapper)', async () => {
    renderClientAuditRoute('audit-xyz-1');

    await waitFor(() => {
      expect(screen.getByText('View your report')).toBeInTheDocument();
    });

    expect(getAuditSpy).toHaveBeenCalledTimes(1);
    expect(getAuditSpy).toHaveBeenCalledWith('audit-xyz-1');
  });

  it('renders completed client navigation links to portal report and strategy lab', async () => {
    renderClientAuditRoute('audit-nav-1');

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /View your report/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Open Strategy Lab/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /View your report/i })).toHaveAttribute(
      'href',
      '/portal/reports/audit-nav-1',
    );
    expect(screen.getByRole('link', { name: /Open Strategy Lab/i })).toHaveAttribute(
      'href',
      '/portal/strategy/audit-nav-1',
    );
  });

  it('renders post-audit cockpit CTAs for completed paid audits', async () => {
    renderClientAuditRoute('audit-cockpit-1');

    await waitFor(() => {
      expect(screen.getByText('What you have now')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /Open execution timeline/i })).toHaveAttribute(
      'href',
      '/portal/reports/audit-cockpit-1#glc-execution-roadmap',
    );
    expect(screen.getByRole('link', { name: /Full domain report/i })).toHaveAttribute(
      'href',
      '/portal/reports/audit-cockpit-1',
    );
    expect(screen.getByRole('link', { name: /^Strategy Lab$/i })).toHaveAttribute(
      'href',
      '/portal/strategy/audit-cockpit-1',
    );
  });

  it('shows friendly copy for 404 from getAudit', async () => {
    getAuditSpy.mockRejectedValue(new apiService.ApiError('Not found', 404));

    renderClientAuditRoute('missing-audit');

    await waitFor(() => {
      expect(screen.getByText('We could not find this audit.')).toBeInTheDocument();
    });

    expect(getAuditSpy).toHaveBeenCalledTimes(1);
  });

  it('renders created-state brief section and disabled start action when gates block launch', async () => {
    getAuditSpy.mockImplementation(async (id: string) => minimalCreatedAudit(id));

    renderClientAuditRoute('audit-created-1');

    await waitFor(() => {
      expect(screen.getByText('Pre-Audit Brief')).toBeInTheDocument();
    });

    expect(screen.getByText('Run the audit')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start audit/i })).toBeDisabled();
    expect(getBriefSpy).toHaveBeenCalled();
  });

  it('renders free-snapshot completion panel for client account mirror flow', async () => {
    getAuditSpy.mockImplementation(async (id: string) => minimalCompletedFreeSnapshotAudit(id));

    renderClientAuditRoute('audit-snapshot-1');

    await waitFor(() => {
      expect(screen.getByText(/Quick scan in your account/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Continue with a package/i)).toBeInTheDocument();
  });

  it('surfaces upgrade error when snapshot-to-audit upgrade fails', async () => {
    getAuditSpy.mockImplementation(async (id: string) => minimalCompletedFreeSnapshotAudit(id));
    upgradeSpy.mockRejectedValueOnce(new Error('Upgrade failed'));

    renderClientAuditRoute('audit-snapshot-1');

    await waitFor(() => {
      expect(screen.getByText(/Continue with a package/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Continue with detected details/i }));

    await waitFor(() => {
      expect(screen.getByText('Upgrade failed')).toBeInTheDocument();
    });
  });

  it('shows success feedback after help request on created audit', async () => {
    getAuditSpy.mockImplementation(async (id: string) => minimalCreatedAudit(id));

    renderClientAuditRoute('audit-created-help-ok');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send help request/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /send help request/i }));

    await waitFor(() => {
      expect(screen.getByText(/We notified the team/i)).toBeInTheDocument();
    });
    expect(requestHelpSpy).toHaveBeenCalledWith('audit-created-help-ok', '');
  });

  it('shows error feedback when help request fails', async () => {
    getAuditSpy.mockImplementation(async (id: string) => minimalCreatedAudit(id));
    requestHelpSpy.mockRejectedValueOnce(new Error('Help queue unavailable'));

    renderClientAuditRoute('audit-created-help-fail');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send help request/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /send help request/i }));

    await waitFor(() => {
      expect(screen.getByText('Help queue unavailable')).toBeInTheDocument();
    });
  });

  it('shows start error when launch fails even when gate allows start', async () => {
    getAuditSpy.mockImplementation(async (id: string) => minimalCreatedAudit(id));
    getBriefSpy.mockResolvedValue({
      product_mode: 'full',
      brief: mockIntakeBrief,
      questions: [],
      validation: {
        passed: true,
        sla_met: true,
        answered_required: 1,
        total_required: 1,
        answered_recommended: 0,
        total_recommended: 0,
        missing_required: [],
      },
      gates: {
        canStartSnapshot: true,
        canStartExpress: true,
        canStartFull: true,
        canStartPipeline: true,
        missingRequiredIds: [],
        recommendedToImproveIds: [],
        intakeProgress: {
          progressPct: 100,
          readinessBadge: 'high',
          nextBestAction: 'add_recommended',
        },
      },
      intakeProgress: {
        progressPct: 100,
        readinessBadge: 'high',
        nextBestAction: 'add_recommended',
      },
    });
    startPipelineSpy.mockRejectedValueOnce(new Error('Start blocked'));

    renderClientAuditRoute('audit-created-start-fail');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start audit/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /start audit/i }));

    await waitFor(() => {
      expect(screen.getByText('Start blocked')).toBeInTheDocument();
    });
  });

});
