import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { ReactNode } from 'react';

import { ReportViewer } from '../ReportViewer';
import { REPORT_VIEWER_COPY } from '../../features/report-viewer/config/report-viewer.copy.en';

const useAuditMock = vi.fn();
const downloadReportPdfMock = vi.fn();
const downloadReportCsvMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('../../hooks/useAudit', () => ({
  useAudit: (...args: unknown[]) => useAuditMock(...args),
}));

vi.mock('../../components/AppShell', () => ({
  AppShell: ({ children, actions }: { children: ReactNode; actions?: ReactNode }) => (
    <div>
      {actions}
      {children}
    </div>
  ),
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
  DomainScorecard: () => <div>Scorecard content</div>,
}));
vi.mock('../../features/report-viewer/components/ReportFindings', () => ({
  ReportFindings: () => <div>Findings content</div>,
}));
vi.mock('../../features/report-viewer/components/FollowUpCard', () => ({
  FollowUpCard: () => null,
}));
vi.mock('../../components/pipeline/ExecutionLogPanel', () => ({
  ExecutionLogPanel: () => null,
}));

vi.mock('../../features/report-viewer/services/report-export.client', () => ({
  downloadReportPdf: (...args: unknown[]) => downloadReportPdfMock(...args),
  downloadReportCsv: (...args: unknown[]) => downloadReportCsvMock(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

describe('ReportViewer feedback states', () => {
  const reloadMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    reloadMock.mockReset();
    useAuditMock.mockReturnValue({
      loading: false,
      error: null,
      reload: reloadMock,
      audit: {
        meta: {
          status: 'completed',
          industry: null,
          created_at: '2025-01-01T00:00:00Z',
        },
        strategy: null,
      },
    });
  });

  it('shows actionable controls in error state', () => {
    useAuditMock.mockReturnValue({
      loading: false,
      error: 'Load failed',
      reload: reloadMock,
      audit: null,
    });

    render(
      <MemoryRouter initialEntries={['/reports/audit-1']}>
        <Routes>
          <Route path="/reports/:id" element={<ReportViewer />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to workspace/i })).toHaveAttribute('href', '/dashboard');
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when audit is still loading', () => {
    useAuditMock.mockReturnValue({
      loading: true,
      error: null,
      reload: reloadMock,
      audit: null,
    });

    render(
      <MemoryRouter initialEntries={['/reports/audit-1']}>
        <Routes>
          <Route path="/reports/:id" element={<ReportViewer />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows toast when PDF export fails', async () => {
    downloadReportPdfMock.mockRejectedValue(new Error('Network failed'));
    render(
      <MemoryRouter initialEntries={['/reports/audit-1']}>
        <Routes>
          <Route path="/reports/:id" element={<ReportViewer />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: REPORT_VIEWER_COPY.buttons.exportPdfTitle }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Network failed');
    });
  });

  it('shows toast when CSV export fails', async () => {
    downloadReportCsvMock.mockRejectedValue(new Error('Network failed'));
    render(
      <MemoryRouter initialEntries={['/reports/audit-1']}>
        <Routes>
          <Route path="/reports/:id" element={<ReportViewer />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: REPORT_VIEWER_COPY.buttons.actionPlanCsvTitle }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Network failed');
    });
  });

  it('sets export controls busy while running', async () => {
    let resolvePdf: (() => void) | null = null;
    downloadReportPdfMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvePdf = resolve;
        }),
    );
    render(
      <MemoryRouter initialEntries={['/reports/audit-1']}>
        <Routes>
          <Route path="/reports/:id" element={<ReportViewer />} />
        </Routes>
      </MemoryRouter>,
    );

    const pdfButton = screen.getByRole('button', { name: REPORT_VIEWER_COPY.buttons.exportPdfTitle });
    fireEvent.click(pdfButton);
    expect(pdfButton).toHaveAttribute('aria-busy', 'true');
    expect(pdfButton).toBeDisabled();

    resolvePdf?.();
    await waitFor(() => {
      expect(pdfButton).toHaveAttribute('aria-busy', 'false');
      expect(pdfButton).not.toBeDisabled();
    });
  });

  it('keeps report page focused on scorecard and findings', () => {
    render(
      <MemoryRouter initialEntries={['/reports/audit-1']}>
        <Routes>
          <Route path="/reports/:id" element={<ReportViewer />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Scorecard content')).toBeInTheDocument();
    expect(screen.getByText('Findings content')).toBeInTheDocument();
    expect(screen.queryByText(/Analysis essentials/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Start here/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Execution Log/i)).not.toBeInTheDocument();
  });
});
