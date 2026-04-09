import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { RootEntry } from '../RootEntry';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import type { User, Session } from '@supabase/supabase-js';

vi.mock('../../hooks/useAuth', async importOriginal => {
  const actual = await importOriginal<typeof import('../../hooks/useAuth')>();
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});
vi.mock('../../hooks/useProfile');

const mockUseAuth = vi.mocked(useAuth);
const mockUseProfile = vi.mocked(useProfile);

const AUTH_STUB = {
  user: null as User | null,
  session: null as Session | null,
  loading: false,
  isAuthenticated: false,
  authError: null as string | null,
  signInWithPassword: vi.fn(),
  signUpWithPassword: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
};

const PROFILE_STUB = {
  profile: null,
  role: null as 'consultant' | 'client' | 'guest' | null,
  roleDisplayName: null as 'Admin' | 'Client' | 'Guest' | null,
  isConsultant: false,
  isAdmin: false,
  isClient: false,
  isGuest: false,
  loading: false,
  error: null as string | null,
  refetch: vi.fn(),
};

function renderRoot(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<RootEntry />} />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
        <Route path="/portal" element={<div>Portal page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseProfile.mockReturnValue(PROFILE_STUB);
});

describe('RootEntry', () => {
  it('renders marketing home immediately while auth is still loading (no blocking loader)', () => {
    mockUseAuth.mockReturnValue({ ...AUTH_STUB, loading: true });

    renderRoot(['/']);

    expect(screen.getByTestId('hero-cta-snapshot')).toBeInTheDocument();
  });

  it('renders marketing home while profile is still loading for an authenticated user', () => {
    mockUseAuth.mockReturnValue({
      ...AUTH_STUB,
      loading: false,
      isAuthenticated: true,
      user: { id: 'u1', email: 'c@c.com' } as User,
    });
    mockUseProfile.mockReturnValue({
      ...PROFILE_STUB,
      loading: true,
      isConsultant: true,
    });

    renderRoot(['/']);

    expect(screen.getByTestId('hero-cta-snapshot')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard page')).not.toBeInTheDocument();
  });

  it('redirects OAuth code query to /login preserving search', () => {
    mockUseAuth.mockReturnValue(AUTH_STUB);

    renderRoot(['/?code=abc']);

    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('redirects consultant to dashboard when profile is ready', async () => {
    mockUseAuth.mockReturnValue({
      ...AUTH_STUB,
      loading: false,
      isAuthenticated: true,
      user: { id: 'u1', email: 'c@c.com' } as User,
    });
    mockUseProfile.mockReturnValue({
      ...PROFILE_STUB,
      loading: false,
      isConsultant: true,
    });

    renderRoot(['/']);

    await waitFor(() => expect(screen.getByText('Dashboard page')).toBeInTheDocument());
  });

  it('redirects client to portal when profile is ready', async () => {
    mockUseAuth.mockReturnValue({
      ...AUTH_STUB,
      loading: false,
      isAuthenticated: true,
      user: { id: 'u2', email: 'cl@example.com' } as User,
    });
    mockUseProfile.mockReturnValue({
      ...PROFILE_STUB,
      loading: false,
      isClient: true,
    });

    renderRoot(['/']);

    await waitFor(() => expect(screen.getByText('Portal page')).toBeInTheDocument());
  });

  it('redirects to login when profile failed to resolve (role null)', async () => {
    mockUseAuth.mockReturnValue({
      ...AUTH_STUB,
      loading: false,
      isAuthenticated: true,
      user: { id: 'u3', email: 'x@example.com' } as User,
    });
    mockUseProfile.mockReturnValue({
      ...PROFILE_STUB,
      loading: false,
      role: null,
    });

    renderRoot(['/']);

    await waitFor(() => expect(screen.getByText('Login page')).toBeInTheDocument());
  });

  it('keeps guest role on marketing home', () => {
    mockUseAuth.mockReturnValue({
      ...AUTH_STUB,
      loading: false,
      isAuthenticated: true,
      user: { id: 'u4', email: 'g@g.com' } as User,
    });
    mockUseProfile.mockReturnValue({
      ...PROFILE_STUB,
      loading: false,
      role: 'guest',
      isGuest: true,
    });

    renderRoot(['/']);

    expect(screen.getByTestId('hero-cta-snapshot')).toBeInTheDocument();
  });

  it('does not redirect anonymous preview sessions', () => {
    mockUseAuth.mockReturnValue({
      ...AUTH_STUB,
      loading: false,
      isAuthenticated: true,
      user: { id: 'anon', is_anonymous: true } as User,
    });
    mockUseProfile.mockReturnValue({
      ...PROFILE_STUB,
      loading: false,
    });

    renderRoot(['/']);

    expect(screen.getByTestId('hero-cta-snapshot')).toBeInTheDocument();
  });
});
