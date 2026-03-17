import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';

// ─── Hoisted mocks (available before vi.mock hoisting) ─────────────────────

const { mockGetSession, mockOnAuthStateChange, mockSignOut } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockOnAuthStateChange = vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  }));
  const mockSignOut = vi.fn().mockResolvedValue({});
  return { mockGetSession, mockOnAuthStateChange, mockSignOut };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signOut: mockSignOut,
    },
  },
}));

// Import hook AFTER mocks
import { useAuth } from '../useAuth';

// ─── Tests ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
});

describe('useAuth', () => {
  it('starts with loading=true and user=null before getSession resolves', () => {
    // getSession never resolves — simulates pending request
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

  it('sets user=null and loading=false when getSession rejects (Sprint 4 .catch fix)', async () => {
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
});
