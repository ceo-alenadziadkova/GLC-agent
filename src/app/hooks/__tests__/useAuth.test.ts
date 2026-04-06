import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';

// ─── Hoisted mocks ─────────────────────────────────────────────────────────

const {
  mockGetSession,
  mockOnAuthStateChange,
  mockSignOut,
  mockExchangeCodeForSession,
  mockSetSession,
  mockLinkIdentity,
  mockSignInWithOAuth,
  mockSignUp,
} = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockOnAuthStateChange = vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  }));
  const mockSignOut = vi.fn().mockResolvedValue({});
  const mockExchangeCodeForSession = vi.fn();
  const mockSetSession = vi.fn();
  const mockLinkIdentity = vi.fn().mockResolvedValue({ error: null });
  const mockSignInWithOAuth = vi.fn().mockResolvedValue({ error: null });
  const mockSignUp = vi.fn().mockResolvedValue({ error: null });
  return {
    mockGetSession,
    mockOnAuthStateChange,
    mockSignOut,
    mockExchangeCodeForSession,
    mockSetSession,
    mockLinkIdentity,
    mockSignInWithOAuth,
    mockSignUp,
  };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      exchangeCodeForSession: mockExchangeCodeForSession,
      setSession: mockSetSession,
      linkIdentity: mockLinkIdentity,
      signInWithOAuth: mockSignInWithOAuth,
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: mockSignUp,
      signOut: mockSignOut,
    },
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import { useAuth } from '../useAuth';

function stubLocationHref(href: string) {
  const url = new URL(href);
  vi.spyOn(window, 'location', 'get').mockReturnValue({
    ...window.location,
    href,
    search: url.search,
    hash: url.hash,
    pathname: url.pathname,
    origin: url.origin,
  } as Location);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockOnAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  }));
  mockGetSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });
  stubLocationHref('http://localhost/login');
  vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function getAuthStateChangeCallback(): (event: string, session: unknown) => void {
  const call = mockOnAuthStateChange.mock.calls[0];
  expect(call).toBeDefined();
  return call[0] as (event: string, session: unknown) => void;
}

describe('useAuth', () => {
  it('starts with loading=true and user=null before getSession resolves', () => {
    mockGetSession.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('sets user and loading=false when getSession returns a session', async () => {
    const fakeUser = { id: 'user-1', email: 'test@example.com' };
    mockGetSession.mockResolvedValue({
      data: { session: { user: fakeUser, access_token: 'tok' } },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('sets user=null and loading=false when getSession rejects', async () => {
    mockGetSession.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('clears user and session after signOut()', async () => {
    const fakeUser = { id: 'user-1', email: 'test@example.com' };
    mockGetSession.mockResolvedValue({
      data: { session: { user: fakeUser, access_token: 'tok' } },
      error: null,
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(fakeUser);

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('exchanges PKCE code before getSession when ?code= is present', async () => {
    const fakeUser = { id: 'pkce-user', email: 'p@p.com' };
    stubLocationHref('http://localhost/login?code=abc123&state=x');
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { user: fakeUser, access_token: 'tok' } },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith(
      'http://localhost/login?code=abc123&state=x',
    );
    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.authError).toBeNull();
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('sets authError when PKCE exchange fails', async () => {
    stubLocationHref('http://localhost/login?code=bad');
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'invalid' },
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.authError).toMatch(/try again/i);
  });

  it('applies implicit hash tokens via setSession when present', async () => {
    stubLocationHref('http://localhost/login#access_token=aa&refresh_token=rr&type=magiclink');
    const fakeUser = { id: 'hash-user', email: 'h@h.com' };
    mockSetSession.mockResolvedValue({
      data: { session: { user: fakeUser, access_token: 'aa' } },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'aa',
      refresh_token: 'rr',
    });
    expect(result.current.user).toEqual(fakeUser);
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('sets authError when setSession from hash fails', async () => {
    stubLocationHref('http://localhost/login#access_token=x&refresh_token=y');
    mockSetSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'bad token' },
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.authError).toMatch(/try again/i);
  });

  it('surfaces OAuth redirect ?error= after cleaning the URL', async () => {
    stubLocationHref(
      'http://localhost/login?error=server_error&error_description=User+already+registered',
    );

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(window.history.replaceState).toHaveBeenCalled();
    expect(result.current.authError).toMatch(/already registered/i);
  });

  it('sets authError when returning from email verify with no session', async () => {
    vi.spyOn(document, 'referrer', 'get').mockReturnValue('https://proj.supabase.co/auth/v1/verify');

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.authError).toMatch(/invalid or expired/i);
  });

  it('syncs state from onAuthStateChange (e.g. sign-out elsewhere)', async () => {
    const fakeUser = { id: 'u1', email: 'a@a.com' };
    mockGetSession.mockResolvedValue({
      data: { session: { user: fakeUser, access_token: 't' } },
      error: null,
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);

    const cb = getAuthStateChangeCallback();
    act(() => {
      cb('SIGNED_OUT', null);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('signInWithGoogle uses linkIdentity for anonymous snapshot session', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'anon', is_anonymous: true },
          access_token: 't',
        },
      },
      error: null,
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mockLinkIdentity).toHaveBeenCalled();
    expect(mockSignInWithOAuth).not.toHaveBeenCalled();
  });

  it('signInWithGoogle uses OAuth when not anonymous', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'u1', email: 'e@e.com', identities: [{ provider: 'email' }] },
          access_token: 't',
        },
      },
      error: null,
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mockSignInWithOAuth).toHaveBeenCalled();
    expect(mockLinkIdentity).not.toHaveBeenCalled();
  });

  it('signUpWithPassword passes emailRedirectTo to current origin /login', async () => {
    stubLocationHref('https://app.example.com/register');

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signUpWithPassword('u@u.com', 'secret12');
    });

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'u@u.com',
        password: 'secret12',
        options: expect.objectContaining({
          emailRedirectTo: 'https://app.example.com/login',
        }),
      }),
    );
  });
});
