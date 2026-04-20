import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { ReactNode } from 'react';

import { PortalTimelinePage } from '../PortalTimelinePage';

const useAuditMock = vi.fn();
const useProfileMock = vi.fn();

vi.mock('../../hooks/useAudit', () => ({
  useAudit: (...args: unknown[]) => useAuditMock(...args),
}));

vi.mock('../../hooks/useProfile', () => ({
  useProfile: () => useProfileMock(),
}));

vi.mock('../../components/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../strategy-lab/StrategyLabOrchestrationPanel', () => ({
  StrategyLabOrchestrationPanel: () => <div>panel</div>,
}));

vi.mock('../../features/report-viewer/components/ReportOrchestrationRoadmapSection', () => ({
  ReportOrchestrationRoadmapSection: () => <div>roadmap</div>,
}));

describe('PortalTimelinePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuditMock.mockReturnValue({
      loading: false,
      error: null,
      reload: vi.fn(),
      audit: {
        meta: {
          id: 'audit-1',
          execution_plan: { selected_domains: ['seo_digital'] },
        },
        strategy: { quick_wins: [] },
      },
    });
  });

  it('uses portal links for client role', () => {
    useProfileMock.mockReturnValue({ isClient: true });
    render(
      <MemoryRouter initialEntries={['/portal/timeline/audit-1']}>
        <Routes>
          <Route path="/portal/timeline/:id" element={<PortalTimelinePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Full domain report/i })).toHaveAttribute(
      'href',
      '/portal/reports/audit-1',
    );
  });

  it('uses workspace links for consultant role', () => {
    useProfileMock.mockReturnValue({ isClient: false });
    render(
      <MemoryRouter initialEntries={['/timeline/audit-1']}>
        <Routes>
          <Route path="/timeline/:id" element={<PortalTimelinePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Full domain report/i })).toHaveAttribute('href', '/reports/audit-1');
    expect(screen.getByRole('link', { name: /Change scope or regenerate the roadmap/i })).toHaveAttribute(
      'href',
      '/strategy/audit-1',
    );
  });
});
