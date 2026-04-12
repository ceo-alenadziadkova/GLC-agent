import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { FreeSnapshotPreview } from '../../data/auditTypes';
import { PortalSnapshotAccountMirror } from '../PortalSnapshotAccountMirror';

const snapshotDiagnosticsMocks = vi.hoisted(() => ({
  getSnapshotAccessBlockedState: vi.fn(),
  formatScanCoverageLine: vi.fn(() => null),
}));

vi.mock('../snapshot/SnapshotScoreKit', () => ({
  SNAPSHOT_SCORE_COLORS: { 1: '#111', 2: '#222', 3: '#333', 4: '#444', 5: '#555' },
  SNAPSHOT_SCORE_LABELS: { 1: 'Critical', 2: 'Needs Work', 3: 'Moderate', 4: 'Good', 5: 'Excellent' },
  SnapshotCategoryBreakdownList: () => <div data-testid="breakdown-list" />,
  SnapshotScoreContextNotes: () => <div data-testid="score-notes" />,
  SnapshotScoreDonut: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  snapshotClassificationExplainerLine: () => null,
  snapshotDonutFillFromLegacyBand: () => 40,
  snapshotDonutFillFromOverall: () => 62,
  snapshotLegacyUxBand: () => 3,
  snapshotScoreColorFrom100: () => '#333',
  snapshotSiteProfileSoftLine: () => null,
}));

vi.mock('../snapshot/SnapshotAccessBlockedCallout', () => ({
  SnapshotAccessBlockedCallout: () => <div data-testid="blocked-callout" />,
}));

vi.mock('../../lib/snapshot-diagnostics', () => ({
  getSnapshotAccessBlockedState: snapshotDiagnosticsMocks.getSnapshotAccessBlockedState,
  formatScanCoverageLine: snapshotDiagnosticsMocks.formatScanCoverageLine,
}));

const mockGetSnapshotAccessBlockedState = snapshotDiagnosticsMocks.getSnapshotAccessBlockedState;

function makeSnapshot(overrides: Partial<FreeSnapshotPreview> = {}): FreeSnapshotPreview {
  return {
    audit_id: 'audit-1',
    snapshot_token: 'snap-1',
    status: 'completed',
    company_url: 'https://example.com',
    company_name: 'Example Co',
    tech_stack: {},
    location: null,
    ux_score: null,
    ux_label: null,
    ux_summary: null,
    issues: [],
    quick_wins: [],
    ...overrides,
  };
}

describe('PortalSnapshotAccountMirror', () => {
  it('renders account-preserved snapshot explanation copy', () => {
    mockGetSnapshotAccessBlockedState.mockReturnValue({
      showCallout: false,
      robotsBlocked: false,
      robotsLimitedSample: false,
      robotsFallbackSiteClass: undefined,
      noPages: false,
    });

    render(<PortalSnapshotAccountMirror result={makeSnapshot()} />);

    expect(screen.getByText('Saved in your account')).toBeInTheDocument();
    expect(screen.getByText(/same quick rule-based scan you saw before sign-up/i)).toBeInTheDocument();
    expect(screen.getByText(/not a full GLC audit/i)).toBeInTheDocument();
  });

  it('shows robots-limited state label when access callout is active', () => {
    mockGetSnapshotAccessBlockedState.mockReturnValue({
      showCallout: true,
      robotsBlocked: true,
      robotsLimitedSample: true,
      robotsFallbackSiteClass: undefined,
      noPages: false,
    });

    render(<PortalSnapshotAccountMirror result={makeSnapshot()} />);

    expect(screen.getByText(/Preview limited.*inner pages sampled/i)).toBeInTheDocument();
    expect(screen.getByTestId('blocked-callout')).toBeInTheDocument();
  });
});
