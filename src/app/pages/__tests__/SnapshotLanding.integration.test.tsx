import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { SnapshotLanding } from '../SnapshotLanding';

vi.mock('../../lib/snapshot-auth', () => ({
  getSnapshotAccessToken: vi.fn().mockResolvedValue('test-bearer-token'),
  isAnonymousUser: vi.fn(() => false),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

vi.mock('../../components/ThemeToggle', () => ({
  ThemeToggle: () => null,
}));

vi.mock('../../components/GlcLogo', () => ({
  GlcLogo: () => <span data-testid="glc-logo-mock" />,
}));

function jsonResponse(data: unknown, ok = true, headers?: HeadersInit, status = ok ? 200 : 500): Promise<Response> {
  return Promise.resolve({
    ok,
    status,
    headers: new Headers(headers),
    json: async () => data,
  } as Response);
}

describe('SnapshotLanding integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs submit then poll and shows completed company name', async () => {
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const u = typeof input === 'string' ? input : String(input);
      if (u.includes('/api/snapshot/quota')) {
        return jsonResponse({ remaining: 9, limit: 10 });
      }
      if (u.includes('/api/snapshot') && !u.match(/\/api\/snapshot\/[^/?]+/)) {
        return jsonResponse({ snapshot_token: 'snap-int-1', status: 'running' }, true, undefined, 202);
      }
      if (u.includes('/api/snapshot/snap-int-1')) {
        return jsonResponse({
          status: 'completed',
          audit_id: 'audit-int',
          snapshot_token: 'snap-int-1',
          company_url: 'https://example.com',
          company_name: 'Example Co',
          tech_stack: {},
          ux_score: 3,
          ux_label: 'Moderate',
          ux_summary: 'Integration test summary line.',
          issues: [],
          quick_wins: [],
          overall_score: 45,
          category_scores: {
            ux_clarity: 50,
            conversion_readiness: 50,
            ai_readiness: 40,
            technical_basics: 40,
          },
        });
      }
      return jsonResponse({}, false);
    }) as typeof fetch;

    render(
      <MemoryRouter>
        <SnapshotLanding />
      </MemoryRouter>,
    );

    const input = await screen.findByPlaceholderText('yourcompany.com');
    await waitFor(() => {
      expect(input).not.toBeDisabled();
    });

    fireEvent.change(input, { target: { value: 'example.com' } });

    const submitBtn = await screen.findByRole('button', { name: /Analyse my website/i });
    fireEvent.click(submitBtn);

    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: 'Example Co' })).toBeInTheDocument();
      },
      { timeout: 12_000 },
    );
  }, 15_000);

  it('shows rate limit message when POST returns 429', async () => {
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const u = typeof input === 'string' ? input : String(input);
      if (u.includes('/api/snapshot/quota')) {
        return jsonResponse({ remaining: 0, limit: 3 });
      }
      if (u.includes('/api/snapshot') && !u.match(/\/api\/snapshot\/[^/?]+/)) {
        return jsonResponse(
          {
            error: 'Daily limit reached',
            retry_after_seconds: 120,
            limit: 3,
            remaining: 0,
          },
          false,
          undefined,
          429,
        );
      }
      return jsonResponse({}, false);
    }) as typeof fetch;

    render(
      <MemoryRouter>
        <SnapshotLanding />
      </MemoryRouter>,
    );

    const input = await screen.findByPlaceholderText('yourcompany.com');
    fireEvent.change(input, { target: { value: 'slow.example.com' } });
    fireEvent.click(await screen.findByRole('button', { name: /Analyse my website/i }));

    await waitFor(() => {
      expect(screen.getByText(/Daily limit reached/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/2 min/i)).toBeInTheDocument();
  });
});
