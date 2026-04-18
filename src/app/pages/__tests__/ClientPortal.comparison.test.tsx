import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ClientPortal } from '../ClientPortal';

vi.mock('../../components/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../components/PortalAuditCard', () => ({
  PortalAuditCard: () => <div data-testid="portal-audit-card" />,
}));

const useAuditsMock = vi.fn();
vi.mock('../../hooks/useAudits', () => ({
  useAudits: (...args: unknown[]) => useAuditsMock(...args),
}));

const compareSnapshotSitesMock = vi.fn();
vi.mock('../../data/apiService', () => ({
  api: {
    compareSnapshotSites: (...args: unknown[]) => compareSnapshotSitesMock(...args),
  },
}));

describe('ClientPortal competitor comparison', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty-state message when no comparable website exists', async () => {
    useAuditsMock.mockReturnValue({
      audits: [{ id: '1', company_url: '', no_public_website: true }],
      loading: false,
      error: '',
    });

    render(
      <MemoryRouter>
        <ClientPortal />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/No public website found in your audits yet/i),
    ).toBeInTheDocument();
  });

  it('submits compare request and shows competitor rows', async () => {
    useAuditsMock.mockReturnValue({
      audits: [{ id: '1', company_url: 'https://example.com', no_public_website: false }],
      loading: false,
      error: '',
    });
    compareSnapshotSitesMock.mockResolvedValue({
      competitor_mini: {
        competitor_name: 'other.com',
        competitor_url: 'https://other.com',
        comparisons: [
          { metric: 'https', client_val: true, comp_val: true, winner: 'tie', label: 'HTTPS' },
        ],
        data_source: 'auto_detected',
        confidence: 'high',
      },
    });

    render(
      <MemoryRouter>
        <ClientPortal />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('competitor.com'), {
      target: { value: 'other.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Compare now/i }));

    await waitFor(() => {
      expect(compareSnapshotSitesMock).toHaveBeenCalledWith('https://example.com', 'other.com');
    });
    expect(screen.getByText(/Compared to other.com/i)).toBeInTheDocument();
  });
});
