import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { NewAudit } from '../NewAudit';

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
  readClientPortalNewAuditDraft: () => ({
    v: 1,
    step: 1,
    url: '',
    noPublicWebsite: true,
    name: 'Seed Co',
    industry: '',
    industrySpecify: '',
    productMode: 'full',
    responses: { old_key: { value: 'legacy', source: 'client' } },
    briefLayoutChoice: 'wizard',
    draftAuditId: null,
    draftIntakeVersions: null,
  }),
  writeClientPortalNewAuditDraft: () => {},
  clearClientPortalNewAuditDraft: () => {},
}));

vi.mock('../../data/apiService', () => ({
  api: {},
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

const navigate = vi.fn();
vi.mock('react-router', async importOriginal => {
  const mod = await importOriginal<typeof import('react-router')>();
  return {
    ...mod,
    useNavigate: () => navigate,
    useSearchParams: () => [new URLSearchParams('')],
  };
});

describe('NewAudit wizard state wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
