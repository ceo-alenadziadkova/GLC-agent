import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { FreeSnapshotPreview } from '../../data/auditTypes';
import { PortalSnapshotAccountMirror } from '../PortalSnapshotAccountMirror';
import { PORTAL_SNAPSHOT_MIRROR_CONSTANTS } from '../portal-snapshot-account-mirror/config/portal-snapshot-account-mirror.constants';

const snapshotDiagnosticsMocks = vi.hoisted(() => ({
  getSnapshotAccessBlockedState: vi.fn(),
  formatScanCoverageLine: vi.fn(() => null),
}));

vi.mock('../snapshot/SnapshotScoreKit', () => ({
  SNAPSHOT_SCORE_COLORS: {
    1: 'var(--score-1)',
    2: 'var(--score-2)',
    3: 'var(--score-3)',
    4: 'var(--score-4)',
    5: 'var(--score-5)',
  },
  SNAPSHOT_SCORE_LABELS: { 1: 'Critical', 2: 'Needs Work', 3: 'Moderate', 4: 'Good', 5: 'Excellent' },
  SnapshotCategoryBreakdownList: () => <div data-testid="breakdown-list" />,
  SnapshotScoreContextNotes: () => <div data-testid="score-notes" />,
  SnapshotScoreDonut: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  snapshotClassificationExplainerLine: () => null,
  snapshotDonutFillFromLegacyBand: () => 40,
  snapshotDonutFillFromOverall: () => 62,
  snapshotLegacyUxBand: () => 3,
  snapshotScoreColorFrom100: () => 'var(--score-3)',
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

  it('shows incomplete preview copy when pages are not loaded', () => {
    mockGetSnapshotAccessBlockedState.mockReturnValue({
      showCallout: true,
      robotsBlocked: false,
      robotsLimitedSample: false,
      robotsFallbackSiteClass: undefined,
      noPages: true,
    });

    render(<PortalSnapshotAccountMirror result={makeSnapshot()} />);

    expect(screen.getByText(/Preview incomplete — pages not loaded/i)).toBeInTheDocument();
  });

  it('falls back to URL hostname when company name is missing', () => {
    mockGetSnapshotAccessBlockedState.mockReturnValue({
      showCallout: false,
      robotsBlocked: false,
      robotsLimitedSample: false,
      robotsFallbackSiteClass: undefined,
      noPages: false,
    });

    render(
      <PortalSnapshotAccountMirror
        result={makeSnapshot({ company_name: ' ', company_url: 'acme.test/path' })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'acme.test' })).toBeInTheDocument();
  });

  it('renders overall score mode when overall_score is present', () => {
    mockGetSnapshotAccessBlockedState.mockReturnValue({
      showCallout: false,
      robotsBlocked: false,
      robotsLimitedSample: false,
      robotsFallbackSiteClass: undefined,
      noPages: false,
    });

    render(<PortalSnapshotAccountMirror result={makeSnapshot({ overall_score: 77 })} />);

    expect(screen.getByText('77')).toBeInTheDocument();
    expect(screen.getByText('/100')).toBeInTheDocument();
  });

  it('caps tech chips to configured limit', () => {
    mockGetSnapshotAccessBlockedState.mockReturnValue({
      showCallout: false,
      robotsBlocked: false,
      robotsLimitedSample: false,
      robotsFallbackSiteClass: undefined,
      noPages: false,
    });
    const chips = Array.from({ length: PORTAL_SNAPSHOT_MIRROR_CONSTANTS.techStackChipLimit + 5 }, (_, i) => `tech-${i}`);
    render(
      <PortalSnapshotAccountMirror
        result={makeSnapshot({
          tech_stack: {
            frontend: chips,
          },
        })}
      />,
    );
    expect(screen.getByText('tech-0')).toBeInTheDocument();
    expect(
      screen.queryByText(`tech-${PORTAL_SNAPSHOT_MIRROR_CONSTANTS.techStackChipLimit + 4}`),
    ).not.toBeInTheDocument();
  });
});
