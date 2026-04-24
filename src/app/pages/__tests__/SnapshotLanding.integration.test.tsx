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

    const submitBtn = await screen.findByRole('button', { name: /Get clarity on my website/i });
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
    fireEvent.click(await screen.findByRole('button', { name: /Get clarity on my website/i }));

    await waitFor(() => {
      expect(screen.getByText(/Daily limit reached/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/2 min/i)).toBeInTheDocument();
  });

  it('recovers after transient poll failures and completes before threshold', async () => {
    let pollAttempts = 0;
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const u = typeof input === 'string' ? input : String(input);
      if (u.includes('/api/snapshot/quota')) {
        return jsonResponse({ remaining: 9, limit: 10 });
      }
      if (u.includes('/api/snapshot') && !u.match(/\/api\/snapshot\/[^/?]+/)) {
        return jsonResponse({ snapshot_token: 'snap-int-2', status: 'running' }, true, undefined, 202);
      }
      if (u.includes('/api/snapshot/snap-int-2')) {
        pollAttempts += 1;
        if (pollAttempts <= 2) {
          return jsonResponse(
            { error: 'Temporary upstream issue' },
            false,
            undefined,
            503,
          );
        }
        return jsonResponse({
          status: 'completed',
          audit_id: 'audit-int-2',
          snapshot_token: 'snap-int-2',
          company_url: 'https://transient.example.com',
          company_name: 'Recovered Co',
          tech_stack: {},
          ux_score: 3,
          ux_label: 'Moderate',
          ux_summary: 'Recovered after transient polling errors.',
          issues: [],
          quick_wins: [],
          overall_score: 48,
          category_scores: {
            ux_clarity: 52,
            conversion_readiness: 49,
            ai_readiness: 44,
            technical_basics: 47,
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
    fireEvent.change(input, { target: { value: 'transient.example.com' } });
    fireEvent.click(await screen.findByRole('button', { name: /Get clarity on my website/i }));

    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: 'Recovered Co' })).toBeInTheDocument();
      },
      { timeout: 15_000 },
    );
    expect(screen.queryByText(/Temporary upstream issue/i)).not.toBeInTheDocument();
  }, 20_000);

  it('enters error state when transient poll failures reach threshold', async () => {
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const u = typeof input === 'string' ? input : String(input);
      if (u.includes('/api/snapshot/quota')) {
        return jsonResponse({ remaining: 9, limit: 10 });
      }
      if (u.includes('/api/snapshot') && !u.match(/\/api\/snapshot\/[^/?]+/)) {
        return jsonResponse({ snapshot_token: 'snap-int-3', status: 'running' }, true, undefined, 202);
      }
      if (u.includes('/api/snapshot/snap-int-3')) {
        return jsonResponse(
          { error: 'Temporary upstream issue' },
          false,
          undefined,
          503,
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
    fireEvent.change(input, { target: { value: 'threshold.example.com' } });
    fireEvent.click(await screen.findByRole('button', { name: /Get clarity on my website/i }));

    await waitFor(
      () => {
        expect(screen.getByText(/Temporary upstream issue/i)).toBeInTheDocument();
      },
      { timeout: 20_000 },
    );
    expect(screen.queryByRole('heading', { name: 'Recovered Co' })).not.toBeInTheDocument();
  }, 25_000);

  it('renders AI visibility gaps explainers when gaps exist', async () => {
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const u = typeof input === 'string' ? input : String(input);
      if (u.includes('/api/snapshot/quota')) {
        return jsonResponse({ remaining: 9, limit: 10 });
      }
      if (u.includes('/api/snapshot') && !u.match(/\/api\/snapshot\/[^/?]+/)) {
        return jsonResponse({ snapshot_token: 'snap-int-ai-gaps-1', status: 'running' }, true, undefined, 202);
      }
      if (u.includes('/api/snapshot/snap-int-ai-gaps-1')) {
        return jsonResponse({
          status: 'completed',
          audit_id: 'audit-int-ai-gaps-1',
          snapshot_token: 'snap-int-ai-gaps-1',
          company_url: 'https://ai-gaps.example.com',
          company_name: 'Gaps Co',
          tech_stack: {},
          ux_score: 3,
          ux_label: 'Moderate',
          ux_summary: 'AI gaps test summary',
          issues: [],
          quick_wins: [],
          overall_score: 42,
          ai_visibility: { gaps: ['robots_txt'] },
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
    fireEvent.change(input, { target: { value: 'gaps.example.com' } });
    fireEvent.click(await screen.findByRole('button', { name: /Get clarity on my website/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Gaps Co' })).toBeInTheDocument();
    });

    expect(screen.getByText(/For your site/i)).toBeInTheDocument();
    expect(screen.getByText(/needs improvement/i)).toBeInTheDocument();
    expect(screen.queryByText(/On a quick read we did not flag critical gaps/i)).not.toBeInTheDocument();

    const briefLink = await screen.findByRole('link', { name: /Continue with Brief/i });
    expect(briefLink).toHaveAttribute('href', '/brief');

    const proLink = await screen.findByRole('link', { name: /View Pro package/i });
    expect(proLink).toHaveAttribute('href', '/pro');
  }, 20_000);

  it('renders AI visibility no-gaps explainers when gaps are empty', async () => {
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const u = typeof input === 'string' ? input : String(input);
      if (u.includes('/api/snapshot/quota')) {
        return jsonResponse({ remaining: 9, limit: 10 });
      }
      if (u.includes('/api/snapshot') && !u.match(/\/api\/snapshot\/[^/?]+/)) {
        return jsonResponse({ snapshot_token: 'snap-int-ai-nogaps-1', status: 'running' }, true, undefined, 202);
      }
      if (u.includes('/api/snapshot/snap-int-ai-nogaps-1')) {
        return jsonResponse({
          status: 'completed',
          audit_id: 'audit-int-ai-nogaps-1',
          snapshot_token: 'snap-int-ai-nogaps-1',
          company_url: 'https://ai-nogaps.example.com',
          company_name: 'NoGaps Co',
          tech_stack: {},
          ux_score: 3,
          ux_label: 'Moderate',
          ux_summary: 'AI no-gaps test summary',
          issues: [],
          quick_wins: [],
          overall_score: 41,
          ai_visibility: { gaps: [] },
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
    fireEvent.change(input, { target: { value: 'nogaps.example.com' } });
    fireEvent.click(await screen.findByRole('button', { name: /Get clarity on my website/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'NoGaps Co' })).toBeInTheDocument();
    });

    expect(screen.getByText(/On a quick read we did not flag critical gaps/i)).toBeInTheDocument();
    expect(screen.queryByText(/For your site/i)).not.toBeInTheDocument();
  }, 20_000);
});
