import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn(() => ({
  data: { subscription: { unsubscribe: vi.fn() } },
}));
const mockSingle = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => mockSingle(),
        }),
      }),
    }),
  },
}));

import { useProfile } from '../useProfile';

beforeEach(() => {
  vi.clearAllMocks();
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
});

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
});
