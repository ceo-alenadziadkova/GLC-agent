import { describe, expect, it } from 'vitest';
import type { AuditState } from '../../../data/auditTypes';
import { deriveDomainDisplay, derivePortalSubtitle, deriveStatusLabel } from './view-model';

function makeAuditState(companyUrl: string): AuditState {
  return {
    meta: {
      id: 'a1',
      user_id: 'u1',
      client_id: 'c1',
      company_url: companyUrl,
      no_public_website: false,
      company_name: 'Example',
      industry: null,
      status: 'completed',
      current_phase: 8,
      overall_score: 3,
      product_mode: 'full',
      token_budget: 1000,
      tokens_used: 100,
      snapshot_token: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
    recon: null,
    domains: {},
    strategy: null,
    reviews: [],
    brief: null,
  };
}

describe('client audit view-model', () => {
  it('derives hostname from valid URL', () => {
    expect(deriveDomainDisplay(makeAuditState('https://example.com/path'))).toBe('example.com');
  });

  it('falls back to raw URL when invalid', () => {
    expect(deriveDomainDisplay(makeAuditState('not-a-url'))).toBe('not-a-url');
  });

  it('normalizes underscore status label', () => {
    expect(deriveStatusLabel({ status: 'in_progress' } as never)).toBe('in progress');
  });

  it('uses limited snapshot subtitle when callout enabled', () => {
    const subtitle = derivePortalSubtitle(
      { status: 'completed' } as never,
      true,
      { showCallout: true, robotsLimitedSample: true },
    );
    expect(subtitle).toContain('robots.txt blocked the homepage');
  });
});
