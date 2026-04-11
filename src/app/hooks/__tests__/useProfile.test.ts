import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';

type AuthListener = (event: string, session: Session | null) => void;

const profileSupabaseMocks = vi.hoisted(() => {
  const ctx = { authListener: null as AuthListener | null };
  const mockGetSession = vi.fn();
  const mockOnAuthStateChange = vi.fn((callback: AuthListener) => {
    ctx.authListener = callback;
    return {
      data: { subscription: { unsubscribe: vi.fn() } },
    };
  });
  const mockSingle = vi.fn();
  return {
    ctx,
    mockGetSession,
    mockOnAuthStateChange,
    mockSingle,
    resetAuthListener: () => {
      ctx.authListener = null;
    },
    fireAuthEvent: (event: string, session: Session | null) => {
      ctx.authListener?.(event, session);
    },
  };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => profileSupabaseMocks.mockGetSession(),
      onAuthStateChange: profileSupabaseMocks.mockOnAuthStateChange,
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => profileSupabaseMocks.mockSingle(),
        }),
      }),
    }),
  },
}));

import { useProfile } from '../useProfile';

const { mockGetSession, mockOnAuthStateChange, mockSingle, resetAuthListener, fireAuthEvent } =
  profileSupabaseMocks;

beforeEach(() => {
  vi.clearAllMocks();
  resetAuthListener();
  mockOnAuthStateChange.mockImplementation((callback: AuthListener) => {
    profileSupabaseMocks.ctx.authListener = callback;
    return {
      data: { subscription: { unsubscribe: vi.fn() } },
    };
  });
});

function sessionFixture(userId: string, token = 'tok'): Session {
  return {
    user: { id: userId } as Session['user'],
    access_token: token,
  } as Session;
}

describe('useProfile', () => {
  it('returns null profile when no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useProfile());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toBeNull();
    expect(result.current.role).toBeNull();
  });

  it('loads consultant profile from Supabase', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1' },
          access_token: 'tok',
        },
      },
    });
    mockSingle.mockResolvedValue({
      data: {
        id: 'user-1',
        role: 'consultant',
        full_name: 'Ada',
        created_at: '2025-01-01',
      },
      error: null,
    });

    const { result } = renderHook(() => useProfile());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBe('consultant');
    expect(result.current.isConsultant).toBe(true);
    expect(result.current.roleDisplayName).toBe('Admin');
  });

  it('promotes guest role when API returns client', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-2' },
          access_token: 'tok2',
        },
      },
    });
    mockSingle
      .mockResolvedValueOnce({
        data: {
          id: 'user-2',
          role: 'guest',
          full_name: null,
          created_at: '2025-01-01',
        },
        error: null,
      });

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ role: 'client', full_name: 'Bob' }),
    } as Response);

    const { result } = renderHook(() => useProfile());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBe('client');
    expect(result.current.isClient).toBe(true);
    expect(fetchMock).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('ignores late profile row after unmount (cancelled load)', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-z' },
          access_token: 'tok',
        },
      },
    });

    let finishSingle: (v: { data: Record<string, unknown>; error: null }) => void;
    mockSingle.mockImplementation(
      () =>
        new Promise(resolve => {
          finishSingle = resolve;
        }),
    );

    const { unmount } = renderHook(() => useProfile());

    await waitFor(() => expect(mockSingle).toHaveBeenCalled());
    unmount();

    await act(async () => {
      finishSingle!({
        data: {
          id: 'user-z',
          role: 'client',
          full_name: 'Late',
          created_at: '2025-01-01',
        },
        error: null,
      });
      await Promise.resolve();
    });
  });

  it('does not refetch profile on TOKEN_REFRESHED or INITIAL_SESSION', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: sessionFixture('user-auth-ev') },
    });
    mockSingle.mockResolvedValue({
      data: {
        id: 'user-auth-ev',
        role: 'client',
        full_name: 'Eve',
        created_at: '2025-01-01',
      },
      error: null,
    });

    renderHook(() => useProfile());

    await waitFor(() => expect(mockSingle).toHaveBeenCalledTimes(1));

    await act(async () => {
      fireAuthEvent('TOKEN_REFRESHED', sessionFixture('user-auth-ev'));
      fireAuthEvent('INITIAL_SESSION', sessionFixture('user-auth-ev'));
      await Promise.resolve();
    });

    expect(mockSingle).toHaveBeenCalledTimes(1);
  });

  it('refetches on USER_UPDATED without toggling loading to true (background)', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: sessionFixture('user-bg') },
    });

    let resolveSecond: (v: { data: Record<string, unknown>; error: null }) => void;
    const secondSingle = new Promise<{ data: Record<string, unknown>; error: null }>(resolve => {
      resolveSecond = resolve;
    });

    mockSingle
      .mockResolvedValueOnce({
        data: {
          id: 'user-bg',
          role: 'client',
          full_name: 'First',
          created_at: '2025-01-01',
        },
        error: null,
      })
      .mockImplementationOnce(() => secondSingle);

    const { result } = renderHook(() => useProfile());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockSingle).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireAuthEvent('USER_UPDATED', sessionFixture('user-bg'));
    });

    expect(mockSingle).toHaveBeenCalledTimes(2);
    expect(result.current.loading).toBe(false);

    await act(async () => {
      resolveSecond!({
        data: {
          id: 'user-bg',
          role: 'client',
          full_name: 'Updated',
          created_at: '2025-01-01',
        },
        error: null,
      });
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.profile?.full_name).toBe('Updated'));
    expect(result.current.loading).toBe(false);
  });

  it('refetches in background when SIGNED_IN repeats for the same user (tab focus / session replay)', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: sessionFixture('user-in') },
    });
    mockSingle.mockResolvedValue({
      data: {
        id: 'user-in',
        role: 'client',
        full_name: 'Signy',
        created_at: '2025-01-01',
      },
      error: null,
    });

    const { result } = renderHook(() => useProfile());

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(mockSingle).toHaveBeenCalledTimes(1));

    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'user-in',
        role: 'client',
        full_name: 'Signy2',
        created_at: '2025-01-01',
      },
      error: null,
    });

    await act(async () => {
      fireAuthEvent('SIGNED_IN', sessionFixture('user-in'));
      await Promise.resolve();
    });

    expect(result.current.loading).toBe(false);
    await waitFor(() => expect(mockSingle).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.profile?.full_name).toBe('Signy2'));
  });
});
