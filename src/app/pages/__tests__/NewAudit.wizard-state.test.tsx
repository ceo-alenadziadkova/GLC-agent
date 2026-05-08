import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { NewAudit } from '../NewAudit';
import { WORKSPACE_PAGE_COPY } from '../../config/workspace-page-copy';
import { NEW_AUDIT_ALL_COVERAGE_DOMAINS } from '../../config/new-audit-coverage-policy';

const { mockDraft, consultantDraftSeed, apiMock, searchParamsState } = vi.hoisted(() => {
  const mockDraft = {
    v: 1 as const,
    step: 1 as 0 | 1 | 2 | 3,
    url: '',
    noPublicWebsite: true,
    name: 'Seed Co',
    industry: '',
    industrySpecify: '',
    productMode: 'full' as const,
    responses: { old_key: { value: 'legacy', source: 'client' as const } },
    briefLayoutChoice: 'wizard' as const,
    draftAuditId: null as string | null,
    draftIntakeVersions: null,
    coveragePackage: 'complete' as const,
    selectedDomains: [] as string[],
  };
  return {
    searchParamsState: { value: '' },
    consultantDraftSeed: { value: null as (typeof mockDraft) | null },
    mockDraft,
    apiMock: {
      createAudit: vi.fn(),
      saveBrief: vi.fn(),
      startPipeline: vi.fn(),
      linkIntakeTokenToAudit: vi.fn(),
      postAuditsBriefIntelligenceSnapshot: vi.fn(),
      postAuditsBriefIntelligenceWording: vi.fn(),
      postAuditsBriefCloneFrom: vi.fn(),
      getClientProjectContext: vi.fn(),
      getLegalConsents: vi.fn(),
      getBrief: vi.fn(),
      postBriefAnalyticsEvents: vi.fn().mockResolvedValue({ ok: true, received: 1 }),
      getDiscoverySession: vi.fn(),
      postIntakeNextQuestion: vi.fn().mockResolvedValue({
        ok: true,
        action: 'ask' as const,
        questionId: 'a2',
        reason: 'test',
        source: 'deterministic',
        caseKeys: [] as string[],
      }),
    },
  };
});

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

vi.mock('../../hooks/useBriefLayoutPrefsSync', () => ({
  useBriefLayoutPrefsSync: () => {},
}));

vi.mock('../../hooks/useIntakeWizard', () => ({
  useIntakeBankMetrics: () => ({
    dataQualityPct: 50,
    visibleRequiredAnswered: 1,
    visibleRequiredTotal: 2,
    visibleRecommendedAnswered: 0,
    visibleRecommendedTotal: 1,
    missingForReport: [],
  }),
}));

vi.mock('../new-audit/wizard-state/useCoverageSelectionState', () => ({
  useCoverageSelectionState: () => ({
    coveragePackage: 'complete',
    setCoveragePackage: vi.fn(),
    selectedDomains: [...NEW_AUDIT_ALL_COVERAGE_DOMAINS],
    setSelectedDomains: vi.fn(),
    recommendedDomains: [...NEW_AUDIT_ALL_COVERAGE_DOMAINS],
    toggleDomainSelection: vi.fn(),
  }),
}));

vi.mock('../../components/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../components/IntakeBankCoverageHint', () => ({
  IntakeBankCoverageHint: () => <div>coverage</div>,
}));

vi.mock('../../components/BankClassicBriefFields', () => ({
  BankClassicBriefFields: () => <div>classic</div>,
}));

vi.mock('../../components/BriefLayoutPreferenceCards', () => ({
  BriefLayoutPreferenceCards: () => <div>layout</div>,
}));

vi.mock('../../components/IntakeBankWizard', () => ({
  IntakeBankWizard: ({
    responses,
    onResponsesChange,
  }: {
    responses: Record<string, unknown>;
    onResponsesChange: (next: Record<string, unknown>) => void;
  }) => (
    <div>
      <div data-testid="wizard-responses">{JSON.stringify(responses)}</div>
      <button
        type="button"
        onClick={() =>
          onResponsesChange({
            new_only: { value: 'fresh', source: 'client' },
          })
        }
      >
        apply-wizard-update
      </button>
    </div>
  ),
}));

vi.mock('../../lib/client-portal-new-audit-draft', () => ({
  readClientPortalNewAuditDraft: () => mockDraft,
  readConsultantNewAuditDraft: () => consultantDraftSeed.value,
  writeClientPortalNewAuditDraft: vi.fn(),
  writeConsultantNewAuditDraft: vi.fn(),
  clearClientPortalNewAuditDraft: () => {},
  clearConsultantNewAuditDraft: vi.fn(),
}));

vi.mock('../../data/apiService', () => ({
  api: apiMock,
  ApiError: class ApiError extends Error {
    status?: number;
  },
}));

vi.mock('../../lib/glc-query-client', () => ({
  getGlcQueryClient: () => ({}),
}));

vi.mock('../../lib/glc-invalidate-queries', () => ({
  invalidateAuditRelatedQueries: () => {},
  invalidateAuditsListsAndDashboard: () => {},
}));

vi.mock('../../lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

vi.mock('../new-audit/newAuditValidation', async importOriginal => {
  const actual = await importOriginal<typeof import('../new-audit/newAuditValidation')>();
  return {
    ...actual,
    validateNewAuditStep0Input: () => ({
      step1Valid: true,
      coverageValid: true,
      step0Valid: true,
    }),
    computeNewAuditWizardProgress: () => ({
      answeredRequired: 8,
      pipelineRequiredTotal: 8,
      step2Complete: true,
      progressPct: 100,
      readinessBadge: 'high' as const,
      nextBestAction: 'none' as const,
    }),
    listAnsweredPipelineRequiredIds: () => ['a2', 'a5', 'a11', 'a12', 'f1', 'b1', 'd2', 'a10'],
  };
});

const navigate = vi.fn();
vi.mock('react-router', async importOriginal => {
  const mod = await importOriginal<typeof import('react-router')>();
  return {
    ...mod,
    useNavigate: () => navigate,
    useSearchParams: () => [new URLSearchParams(searchParamsState.value)],
  };
});

describe('NewAudit wizard state wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consultantDraftSeed.value = null;
    searchParamsState.value = '';
    localStorage.clear();
    mockDraft.step = 1;
    mockDraft.url = '';
    mockDraft.noPublicWebsite = true;
    mockDraft.name = 'Seed Co';
    mockDraft.industry = '';
    mockDraft.industrySpecify = '';
    mockDraft.responses = { old_key: { value: 'legacy', source: 'client' } };
    mockDraft.draftAuditId = null;
    mockDraft.coveragePackage = 'complete';
    mockDraft.selectedDomains = [...NEW_AUDIT_ALL_COVERAGE_DOMAINS];
    apiMock.createAudit.mockResolvedValue({ id: 'audit-1' });
    apiMock.saveBrief.mockResolvedValue({ brief: { intake_versions: null } });
    apiMock.startPipeline.mockResolvedValue({});
    apiMock.linkIntakeTokenToAudit.mockResolvedValue({});
    apiMock.postAuditsBriefIntelligenceSnapshot.mockResolvedValue({
      questions: [],
      question_ids: [],
      case_keys: [],
      next_recommended: [],
      deterministic_question_ids: [],
      narrative: null,
      inferred_preview: [],
      merge_would_apply_count: 0,
      snapshot_no_new_inferred: true,
      label_overrides: {},
      f2_source: 'deterministic',
      kpi: { invalid_f2_ids_filtered: 0, f2_suggestion_length: 0 },
    });
    apiMock.postAuditsBriefIntelligenceWording.mockResolvedValue({
      label_overrides: {},
      hint_overrides: {},
      option_display_overrides: {},
      kpi: {
        allowed_wording_id_count: 0,
        label_override_key_count: 0,
        hint_override_key_count: 0,
        option_display_id_count: 0,
      },
    });
    apiMock.postAuditsBriefCloneFrom.mockResolvedValue({ brief: {}, gates: {}, validation: {} });
    apiMock.getClientProjectContext.mockResolvedValue({ context: null, precheck: {} });
    apiMock.getLegalConsents.mockResolvedValue({
      effective: [{ consent_key: 'dpa_acceptance', accepted: true }],
    });
    apiMock.getBrief.mockResolvedValue({
      brief: { responses: {}, intake_versions: null },
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
        intakeProgress: { progressPct: 50, readinessBadge: 'medium', nextBestAction: 'none' },
      },
      intakeProgress: { progressPct: 50, readinessBadge: 'medium', nextBestAction: 'none' },
      readiness: { flowReadinessStatus: 'flow_ready', auditReadinessStatus: 'audit_ready', trace: [] },
      critical_signals: { by_key: {}, summary: { satisfied: true } },
      remediation_queue: [],
      next_recommended: [],
    });
    apiMock.getDiscoverySession.mockResolvedValue({ answers: {} });
  });

  it('shows restored draft banner and seeds brief when consultant session draft exists', () => {
    consultantDraftSeed.value = { ...mockDraft, step: 1, selectedDomains: [...NEW_AUDIT_ALL_COVERAGE_DOMAINS] };

    render(
      <MemoryRouter>
        <NewAudit />
      </MemoryRouter>,
    );

    expect(screen.getByText(WORKSPACE_PAGE_COPY.newAudit.draftRestoredTitle)).toBeInTheDocument();
    expect(screen.getByTestId('wizard-responses').textContent).toContain('old_key');
  });

  it('applies wizard next state directly in client self-serve flow', () => {
    render(
      <MemoryRouter>
        <NewAudit variant="client_self_serve" />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('wizard-responses').textContent).toContain('old_key');

    fireEvent.click(screen.getByRole('button', { name: 'apply-wizard-update' }));

    const updated = screen.getByTestId('wizard-responses').textContent ?? '';
    expect(updated).toContain('new_only');
    expect(updated).not.toContain('old_key');
  });

  it('keeps basics values in save payload when launching from restored client draft', async () => {
    mockDraft.step = 3;
    mockDraft.url = 'example.com';
    mockDraft.noPublicWebsite = false;
    mockDraft.name = 'Acme Corp';
    mockDraft.industry = 'Healthcare';
    mockDraft.responses = { old_key: { value: 'legacy', source: 'client' } };

    render(
      <MemoryRouter>
        <NewAudit variant="client_self_serve" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Launch Audit/i }));

    await vi.waitFor(() => expect(apiMock.saveBrief).toHaveBeenCalled());
    const [, payload] = apiMock.saveBrief.mock.calls[0];
    expect(payload.a11).toEqual({ value: 'https://example.com', source: 'client' });
    expect(payload.a12).toEqual({ value: 'Acme Corp', source: 'client' });
    expect(payload.a2).toEqual({ value: 'Healthcare', source: 'client' });
  });

  it('surfaces launch error when pipeline start fails', async () => {
    mockDraft.step = 3;
    mockDraft.url = 'example.com';
    mockDraft.noPublicWebsite = false;
    mockDraft.name = 'Acme Corp';
    mockDraft.industry = 'Healthcare';
    apiMock.startPipeline.mockRejectedValueOnce(new Error('Pipeline unavailable'));

    render(
      <MemoryRouter>
        <NewAudit variant="client_self_serve" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Launch Audit/i }));

    await vi.waitFor(() => {
      expect(screen.getByText('Pipeline unavailable')).toBeInTheDocument();
    });
  });

  it('prefills from discovery session token and clears it from localStorage', async () => {
    searchParamsState.value = 'from_discovery=1';
    localStorage.setItem('glc_discovery_token', 'disc-token-1');
    apiMock.getDiscoverySession.mockResolvedValueOnce({
      answers: { a2: 'Healthcare', a10: 'Need better conversion' },
    });

    render(
      <MemoryRouter>
        <NewAudit variant="client_self_serve" />
      </MemoryRouter>,
    );

    await vi.waitFor(() => {
      expect(apiMock.getDiscoverySession).toHaveBeenCalledWith('disc-token-1');
    });
    expect(localStorage.getItem('glc_discovery_token')).toBeNull();
    await vi.waitFor(() => {
      expect(
        screen.getByText(WORKSPACE_PAGE_COPY.newAudit.step1.discoveryPrefilledBannerText),
      ).toBeInTheDocument();
    });
  });

});
