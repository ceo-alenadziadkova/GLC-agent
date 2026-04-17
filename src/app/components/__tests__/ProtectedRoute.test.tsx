import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import { ProtectedRoute } from '../ProtectedRoute';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import type { User, Session } from '@supabase/supabase-js';

vi.mock('../../hooks/useAuth');
vi.mock('../../hooks/useProfile');

const mockUseAuth = vi.mocked(useAuth);
const mockUseProfile = vi.mocked(useProfile);

const AUTH_STUB = {
  user: null as User | null,
  session: null as Session | null,
  loading: false,
  isAuthenticated: false,
  authError: null as string | null,
  passwordRecoveryMode: false,
  signInWithPassword: vi.fn(),
  signUpWithPassword: vi.fn(),
  requestPasswordReset: vi.fn(),
  completePasswordRecovery: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();
  mockUseProfile.mockReturnValue(PROFILE_STUB);
});

describe('ProtectedRoute', () => {
  function LoginProbe() {
    const location = useLocation();
    return <div data-testid="login-location">{`${location.pathname}${location.search}`}</div>;
  }

  it('shows loading spinner while auth is resolving', () => {
    mockUseAuth.mockReturnValue({ ...AUTH_STUB, loading: true });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('does not render children when not authenticated', () => {
    mockUseAuth.mockReturnValue({ ...AUTH_STUB, loading: false, isAuthenticated: false });

    render(
      <MemoryRouter initialEntries={['/portfolio']}>
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users to /login with next param', async () => {
    mockUseAuth.mockReturnValue({ ...AUTH_STUB, loading: false, isAuthenticated: false });

    render(
      <MemoryRouter initialEntries={['/portfolio?tab=active']}>
        <Routes>
          <Route
            path="/portfolio"
            element={
              <ProtectedRoute>
                <div>Protected content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('login-location')).toHaveTextContent(
        '/login?next=%2Fportfolio%3Ftab%3Dactive',
      );
    });
  });

  it('renders children when authenticated', () => {
    mockUseAuth.mockReturnValue({
      ...AUTH_STUB,
      loading: false,
      isAuthenticated: true,
      user: { id: 'u1', email: 'test@test.com' } as User,
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('redirects guest away from consultant-only route to /snapshot', async () => {
    mockUseAuth.mockReturnValue({
      ...AUTH_STUB,
      loading: false,
      isAuthenticated: true,
      user: { id: 'u1', email: 'g@g.com' } as User,
    });
    mockUseProfile.mockReturnValue({
      ...PROFILE_STUB,
      role: 'guest',
      isGuest: true,
      roleDisplayName: 'Guest',
    });

    render(
      <MemoryRouter initialEntries={['/dash']}>
        <Routes>
          <Route
            path="/dash"
            element={
              <ProtectedRoute requiredRole="consultant">
                <div>Consultant only</div>
              </ProtectedRoute>
            }
          />
          <Route path="/snapshot" element={<div data-testid="snap-dest">Snapshot</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('snap-dest')).toBeInTheDocument();
    });
    expect(screen.queryByText('Consultant only')).not.toBeInTheDocument();
  });

  it('redirects consultant away from client-only route to /portfolio', async () => {
    mockUseAuth.mockReturnValue({
      ...AUTH_STUB,
      loading: false,
      isAuthenticated: true,
      user: { id: 'u1', email: 'c@c.com' } as User,
    });
    mockUseProfile.mockReturnValue({
      ...PROFILE_STUB,
      role: 'consultant',
      isConsultant: true,
      isAdmin: true,
      roleDisplayName: 'Admin',
    });

    render(
      <MemoryRouter initialEntries={['/portal']}>
        <Routes>
          <Route
            path="/portal"
            element={
              <ProtectedRoute requiredRole="client">
                <div>Client only</div>
              </ProtectedRoute>
            }
          />
          <Route path="/portfolio" element={<div data-testid="port-dest">Portfolio</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('port-dest')).toBeInTheDocument();
    });
  });

  it('redirects to /login when role is null but route requires role', async () => {
    mockUseAuth.mockReturnValue({
      ...AUTH_STUB,
      loading: false,
      isAuthenticated: true,
      user: { id: 'u1', email: 'x@x.com' } as User,
    });
    mockUseProfile.mockReturnValue({
      ...PROFILE_STUB,
      role: null,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/dash']}>
        <Routes>
          <Route
            path="/dash"
            element={
              <ProtectedRoute requiredRole="consultant">
                <div>Consultant</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div data-testid="login-dest">Login</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('login-dest')).toBeInTheDocument();
    });
  });

  it('does not show loader on role-gated routes when profile exists but a background refetch sets profileLoading', () => {
    mockUseAuth.mockReturnValue({
      ...AUTH_STUB,
      loading: false,
      isAuthenticated: true,
      user: { id: 'u1', email: 'c@c.com' } as User,
    });
    mockUseProfile.mockReturnValue({
      ...PROFILE_STUB,
      loading: true,
      role: 'client',
      isClient: true,
      profile: {
        id: 'u1',
        role: 'client',
        full_name: null,
        created_at: '2025-01-01',
      },
      roleDisplayName: 'Client',
    });

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="client">
          <div>Client workspace</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Client workspace')).toBeInTheDocument();
  });

  it('shows loader while profile resolves for role-gated routes (no protected flash)', () => {
    mockUseAuth.mockReturnValue({
      ...AUTH_STUB,
      loading: false,
      isAuthenticated: true,
      user: { id: 'u1', email: 'c@c.com' } as User,
    });
    mockUseProfile.mockReturnValue({
      ...PROFILE_STUB,
      loading: true,
      role: null,
    });

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="client">
          <div>Client workspace</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Client workspace')).not.toBeInTheDocument();
  });

  it('does not wait on profile when route is not role-gated (avoids extra spinner)', () => {
    mockUseAuth.mockReturnValue({
      ...AUTH_STUB,
      loading: false,
      isAuthenticated: true,
      user: { id: 'u1', email: 'c@c.com' } as User,
    });
    mockUseProfile.mockReturnValue({
      ...PROFILE_STUB,
      loading: true,
      role: null,
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Generic protected</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Generic protected')).toBeInTheDocument();
  });

  it('redirects guest away from blocked route (e.g. settings)', async () => {
    mockUseAuth.mockReturnValue({
      ...AUTH_STUB,
      loading: false,
      isAuthenticated: true,
      user: { id: 'u1', email: 'g@g.com' } as User,
    });
    mockUseProfile.mockReturnValue({
      ...PROFILE_STUB,
      role: 'guest',
      isGuest: true,
      roleDisplayName: 'Guest',
    });

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route
            path="/settings"
            element={
              <ProtectedRoute blockedForRoles={['guest']}>
                <div>Settings</div>
              </ProtectedRoute>
            }
          />
          <Route path="/snapshot" element={<div data-testid="snap-dest">Snapshot</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('snap-dest')).toBeInTheDocument();
    });
  });
});
