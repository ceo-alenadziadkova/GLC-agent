import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';

import { ClientPostAuditCockpitSection } from '../ClientPostAuditCockpitSection';
import { CLIENT_AUDIT_VIEW_COPY } from '../../../../config/client-audit-view-copy';

const getAuditTimelineMock = vi.fn();

vi.mock('../../../../data/apiService', () => ({
  api: {
    getAuditTimeline: (...args: unknown[]) => getAuditTimelineMock(...args),
  },
}));

vi.mock('../../../../features/report-viewer/domain/selectors', () => ({
  getReportPageViewModel: () => ({
    coverage: {
      coveredDomains: ['seo_digital'],
      missingDomains: [],
      coverageRatio: 1,
      coverageAdjustedScore: 100,
    },
  }),
}));

vi.mock('../../../../config/app-feature-flags', () => ({
  APP_FEATURE_FLAGS: {
    clientTimelineEnabled: true,
    orchestrationRoadmapUiEnabled: true,
    clientRoadmapManifestWizardEnabled: true,
  },
}));

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ClientPostAuditCockpitSection
          audit={
            {
              strategy: { executive_summary: 'Summary', orchestration_pack_version: 1 },
            } as never
          }
          auditId="audit-1"
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ClientPostAuditCockpitSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuditTimelineMock.mockResolvedValue({
      timeline: {
        status: 'ready',
        top_7d: ['n1'],
        top_30d: ['n2'],
        lanes: [
          { lane_id: 'seo', items: [{ id: 'n1', title: 'Improve crawl budget', lane: 'seo' }] },
          { lane_id: 'tech_delivery', items: [{ id: 'n2', title: 'Fix perf budget', lane: 'tech_delivery' }] },
        ],
      },
    });
  });

  it('renders top actions selection block with expected CTAs', async () => {
    renderSection();
    expect(await screen.findByText(CLIENT_AUDIT_VIEW_COPY.cockpit.topActionsSelectionTitle)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: CLIENT_AUDIT_VIEW_COPY.cockpit.selectForNextRoadmapCta })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: CLIENT_AUDIT_VIEW_COPY.cockpit.openDetailsInLabCta })).toBeInTheDocument();
  });

  it('updates selected actions counter when user toggles checkboxes', async () => {
    const user = userEvent.setup();
    renderSection();
    const checkboxes = await screen.findAllByRole('checkbox');
    const checkbox = checkboxes[0]!;
    await user.click(checkbox);
    expect(
      screen.getByText(new RegExp(`${CLIENT_AUDIT_VIEW_COPY.cockpit.topActionsSelectionCountLabel}: 1`)),
    ).toBeInTheDocument();
  });
});
