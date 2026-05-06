import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { ReactNode } from 'react';
import { ReportViewer } from '../ReportViewer';

const useAuditMock = vi.fn();
const getReportPageViewModelMock = vi.fn();

vi.mock('../../hooks/useAudit', () => ({
  useAudit: (...args: unknown[]) => useAuditMock(...args),
}));

vi.mock('../../components/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../features/report-viewer/domain/selectors', () => ({
  getReportPageViewModel: (...args: unknown[]) => getReportPageViewModelMock(...args),
}));

vi.mock('../../features/report-viewer/components/DomainScorecard', () => ({
  DomainScorecard: () => null,
}));
vi.mock('../../features/report-viewer/components/ReportFindings', () => ({
  ReportFindings: () => null,
}));

describe('ReportViewer navigation targets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getReportPageViewModelMock.mockReturnValue({
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
    });
    useAuditMock.mockReturnValue({
      loading: false,
      error: null,
      reload: vi.fn(),
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

  it('normalizes legacy profile query to full mode', () => {
    render(
      <MemoryRouter initialEntries={['/reports/audit-1?profile=tech']}>
        <Routes>
          <Route path="/reports/:id" element={<ReportViewer />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(getReportPageViewModelMock).toHaveBeenCalledWith(expect.any(Object), 'full');
  });

  it('renders only scorecard and findings sections', () => {
    render(
      <MemoryRouter initialEntries={['/reports/audit-1']}>
        <Routes>
          <Route path="/reports/:id" element={<ReportViewer />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('button', { name: /Domain Scorecard/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Critical Issues/i }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Analysis essentials/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Full Report mode is active/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Quick navigation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Follow-up/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Execution Log/i)).not.toBeInTheDocument();
  });

  it('keeps simplified structure for portal report route', () => {
    render(
      <MemoryRouter initialEntries={['/portal/reports/audit-1']}>
        <Routes>
          <Route path="/portal/reports/:id" element={<ReportViewer />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('button', { name: /Domain Scorecard/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Critical Issues/i }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Execution Log/i)).not.toBeInTheDocument();
  });
});

