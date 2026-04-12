import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { AuditMeta } from '../../data/auditTypes';
import { PortalAuditCard } from '../PortalAuditCard';

vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 days ago'),
}));

function makeAudit(overrides: Partial<AuditMeta> = {}): AuditMeta {
  return {
    id: 'audit-1',
    user_id: 'user-1',
    client_id: 'client-1',
    company_url: 'https://example.com',
    company_name: 'Example Co',
    industry: 'SaaS',
    status: 'created',
    current_phase: 0,
    overall_score: null,
    product_mode: 'full',
    token_budget: 100000,
    tokens_used: 0,
    snapshot_token: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

function renderCard(audit: AuditMeta) {
  return render(
    <MemoryRouter>
      <PortalAuditCard audit={audit} />
    </MemoryRouter>,
  );
}

describe('PortalAuditCard', () => {
  it('shows created-state client copy for setup stage', () => {
    renderCard(makeAudit({ status: 'created' }));

    expect(screen.getByText('Brief & setup')).toBeInTheDocument();
    expect(
      screen.getByText(/Complete the intake brief on the next screen/i),
    ).toBeInTheDocument();
  });

  it('shows free-snapshot specific completion hint', () => {
    renderCard(makeAudit({ status: 'completed', product_mode: 'free_snapshot' }));

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText(/Quick scan saved in your account/i)).toBeInTheDocument();
  });

  it('maps unknown statuses into readable fallback label', () => {
    renderCard(makeAudit({ status: 'needs_manual_review' }));

    expect(screen.getByText('needs manual review')).toBeInTheDocument();
    expect(screen.getByText('Open this audit for details.')).toBeInTheDocument();
  });

  it('renders meta line with industry, mode and updated age', () => {
    renderCard(makeAudit({ product_mode: 'express' }));

    expect(screen.getByText(/SaaS · Express audit · Updated 2 days ago/i)).toBeInTheDocument();
  });

  it('hides updated copy when updated_at is missing', () => {
    renderCard(makeAudit({ updated_at: undefined as unknown as string }));

    expect(screen.queryByText(/Updated/i)).not.toBeInTheDocument();
  });
});
