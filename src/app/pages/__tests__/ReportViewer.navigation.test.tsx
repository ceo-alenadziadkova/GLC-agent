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

describe('ReportViewer strategy navigation', () => {
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

  it('uses portal strategy path when opened from portal report', async () => {
    render(
      <MemoryRouter initialEntries={['/portal/reports/audit-1']}>
        <Routes>
          <Route path="/portal/reports/:id" element={<ReportViewer />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /View Strategy Lab/i })).toHaveAttribute(
      'href',
      '/portal/strategy/audit-1',
    );
  });

  it('uses consultant strategy path when opened from workspace report', async () => {
    render(
      <MemoryRouter initialEntries={['/reports/audit-1']}>
        <Routes>
          <Route path="/reports/:id" element={<ReportViewer />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /View Strategy Lab/i })).toHaveAttribute(
      'href',
      '/strategy/audit-1',
    );
  });
});

