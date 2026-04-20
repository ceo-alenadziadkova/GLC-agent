import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { ReactNode } from 'react';
import { ReportViewer } from '../ReportViewer';

const useAuditMock = vi.fn();

vi.mock('../../hooks/useAudit', () => ({
  useAudit: (...args: unknown[]) => useAuditMock(...args),
}));

vi.mock('../../components/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../features/report-viewer/domain/selectors', () => ({
  getReportProfileOptions: () => [{ key: 'full', label: 'Full', Icon: () => null }],
  getReportPageViewModel: () => ({
    companyName: 'Example Co',
    executiveSummary: 'Summary',
    averageScore: 4,
    criticalIssues: [],
    allQuickWins: [],
    coverage: {
      coveredDomains: [],
      missingDomains: [],
      coverageRatio: 1,
      coverageAdjustedScore: 4,
    },
    profileDomains: [],
    visibleDomainEntries: [],
    allStrengths: [],
    answeredFollowUps: 0,
    followUpQuestions: [],
  }),
}));

vi.mock('../../features/report-viewer/components/ProfileTabs', () => ({
  ProfileTabs: () => null,
}));
vi.mock('../../features/report-viewer/components/ReportHeroCard', () => ({
  ReportHeroCard: () => null,
}));
vi.mock('../../features/report-viewer/components/CoverageCard', () => ({
  CoverageCard: () => null,
}));
vi.mock('../../features/report-viewer/components/DomainScorecard', () => ({
  DomainScorecard: () => null,
}));
vi.mock('../../features/report-viewer/components/ReportFindings', () => ({
  ReportFindings: () => null,
}));
vi.mock('../../features/report-viewer/components/FollowUpCard', () => ({
  FollowUpCard: () => null,
}));

describe('ReportViewer navigation targets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuditMock.mockReturnValue({
      loading: false,
      error: null,
      audit: {
        meta: {
          status: 'completed',
          industry: null,
          created_at: '2025-01-01T00:00:00Z',
        },
        strategy: { id: 's1' },
      },
    });
  });

  it('uses portal timeline path when opened from portal report', async () => {
    render(
      <MemoryRouter initialEntries={['/portal/reports/audit-1']}>
        <Routes>
          <Route path="/portal/reports/:id" element={<ReportViewer />} />
        </Routes>
      </MemoryRouter>,
    );

    const timelineLinks = screen.getAllByRole('link', { name: /Open timeline/i });
    expect(timelineLinks.some(link => link.getAttribute('href') === '/portal/timeline/audit-1')).toBe(true);
    expect(screen.getByRole('link', { name: /Open timeline setup/i })).toHaveAttribute(
      'href',
      '/portal/timeline/audit-1#manifest-setup',
    );
  });

  it('uses consultant timeline path when opened from workspace report', async () => {
    render(
      <MemoryRouter initialEntries={['/reports/audit-1']}>
        <Routes>
          <Route path="/reports/:id" element={<ReportViewer />} />
        </Routes>
      </MemoryRouter>,
    );

    const timelineLinks = screen.getAllByRole('link', { name: /Open timeline|View execution timeline/i });
    expect(timelineLinks.some(link => link.getAttribute('href') === '/timeline/audit-1')).toBe(true);
    expect(screen.getByRole('link', { name: /Open timeline setup/i })).toHaveAttribute(
      'href',
      '/timeline/audit-1#manifest-setup',
    );
  });
});

