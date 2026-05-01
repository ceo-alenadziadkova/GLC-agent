import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '../../lib/tanstack-react-query';

import { PORTAL_MANIFEST_WIZARD_COPY } from '../../config/portal-manifest-wizard-copy.en';

const flagState = vi.hoisted(() => ({
  clientRoadmapManifestWizardEnabled: true,
  orchestrationRoadmapUiEnabled: true,
}));

vi.mock('../../config/app-feature-flags', async () => {
  const actual = await vi.importActual<typeof import('../../config/app-feature-flags')>(
    '../../config/app-feature-flags',
  );
  return {
    APP_FEATURE_FLAGS: new Proxy(actual.APP_FEATURE_FLAGS, {
      get(target, prop, receiver) {
        if (prop === 'clientRoadmapManifestWizardEnabled') {
          return flagState.clientRoadmapManifestWizardEnabled;
        }
        if (prop === 'orchestrationRoadmapUiEnabled') {
          return flagState.orchestrationRoadmapUiEnabled;
        }
        return Reflect.get(target, prop, receiver);
      },
    }),
  };
});

const useAuditMock = vi.fn();
vi.mock('../../hooks/useAudit', () => ({
  useAudit: (...args: unknown[]) => useAuditMock(...args),
}));

vi.mock('../../components/AppShell', () => ({
  AppShell: ({ children, title }: { children: ReactNode; title?: string }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  ),
}));

const getRoadmapManifestSnapshotLatestMock = vi.fn();
const postOrchestratorPreviewMock = vi.fn();

vi.mock('../../data/apiService', () => ({
  api: {
    getRoadmapManifestSnapshotLatest: (...args: unknown[]) => getRoadmapManifestSnapshotLatestMock(...args),
    postOrchestratorPreview: (...args: unknown[]) => postOrchestratorPreviewMock(...args),
    postRoadmapManifestSnapshot: vi.fn(),
    postOrchestratorRun: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { PortalRoadmapManifestWizardPage } from '../PortalRoadmapManifestWizardPage';

function renderWithProviders(node: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

const baseAudit = {
  meta: {
    id: 'audit-1',
    execution_plan: { selected_domains: ['seo_digital' as const] },
  },
  strategy: { quick_wins: [] },
};

describe('PortalRoadmapManifestWizardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flagState.clientRoadmapManifestWizardEnabled = true;
    flagState.orchestrationRoadmapUiEnabled = true;
    getRoadmapManifestSnapshotLatestMock.mockResolvedValue({ snapshot: null });
    postOrchestratorPreviewMock.mockResolvedValue({
      preview: {
        lanes_included: ['tech_delivery' as const, 'seo' as const],
        lanes_cut: [] as [],
        waiting_list_domains: [] as [],
        execution_compression_hint: 'mild' as const,
        lane_density_band: 'standard' as const,
        confidence_callouts: [] as [],
      },
    });
    useAuditMock.mockReturnValue({
      loading: false,
      error: null,
      reload: vi.fn(),
      audit: baseAudit,
    });
  });

  it('shows disabled copy when clientRoadmapManifestWizardEnabled is false', () => {
    flagState.clientRoadmapManifestWizardEnabled = false;
    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/audit/audit-1/roadmap-manifest']}>
        <Routes>
          <Route path="/portal/audit/:id/roadmap-manifest" element={<PortalRoadmapManifestWizardPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(PORTAL_MANIFEST_WIZARD_COPY.featureDisabled)).toBeInTheDocument();
  });

  it('shows execution plan missing when selected_domains is empty', () => {
    useAuditMock.mockReturnValue({
      loading: false,
      error: null,
      reload: vi.fn(),
      audit: {
        meta: { id: 'audit-1', execution_plan: { selected_domains: [] } },
        strategy: { quick_wins: [] },
      },
    });
    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/audit/audit-1/roadmap-manifest']}>
        <Routes>
          <Route path="/portal/audit/:id/roadmap-manifest" element={<PortalRoadmapManifestWizardPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(PORTAL_MANIFEST_WIZARD_COPY.executionPlanMissing)).toBeInTheDocument();
  });

  it('renders coverage step and loads manifest preview', async () => {
    renderWithProviders(
      <MemoryRouter initialEntries={['/portal/audit/audit-1/roadmap-manifest']}>
        <Routes>
          <Route path="/portal/audit/:id/roadmap-manifest" element={<PortalRoadmapManifestWizardPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: PORTAL_MANIFEST_WIZARD_COPY.stepCoverageTitle })).toBeInTheDocument();
    await waitFor(() => {
      expect(postOrchestratorPreviewMock).toHaveBeenCalledWith(
        'audit-1',
        expect.objectContaining({
          selected_domains: ['seo_digital'],
          change_scenario: 'hybrid',
          season_preset: 'rolling_90d',
        }),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
    expect(screen.getByRole('heading', { name: PORTAL_MANIFEST_WIZARD_COPY.stepPreviewTitle })).toBeInTheDocument();
  });
});
