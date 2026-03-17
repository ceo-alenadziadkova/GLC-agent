import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ProtectedRoute } from '../ProtectedRoute';
import { useAuth } from '../../hooks/useAuth';
import type { User, Session } from '@supabase/supabase-js';

vi.mock('../../hooks/useAuth');

const mockUseAuth = vi.mocked(useAuth);

const AUTH_STUB = {
  user: null as User | null,
  session: null as Session | null,
  loading: false,
  isAuthenticated: false,
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProtectedRoute', () => {
  it('shows loading spinner while auth is resolving', () => {
    mockUseAuth.mockReturnValue({ ...AUTH_STUB, loading: true });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
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
});
