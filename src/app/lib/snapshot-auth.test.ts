import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from '@supabase/supabase-js';
import {
  GLC_PREVIEW_GUEST_SESSION_KEY,
  isAnonymousUser,
  ensureSnapshotSession,
  getSnapshotAccessToken,
} from './snapshot-auth';

const mockGetSession = vi.fn();
const mockSetSession = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      setSession: (payload: unknown) => mockSetSession(payload),
    },
  },
}));

describe('isAnonymousUser', () => {
  it('returns false for null', () => {
    expect(isAnonymousUser(null)).toBe(false);
  });

  it('returns true when is_anonymous is true', () => {
    const u = { id: 'x', is_anonymous: true } as User;
    expect(isAnonymousUser(u)).toBe(true);
  });

  it('returns true when all identities are anonymous', () => {
    const u = {
      id: 'x',
      identities: [{ provider: 'anonymous' }, { provider: 'anonymous' }],
    } as User;
    expect(isAnonymousUser(u)).toBe(true);
  });

  it('returns false when any identity is not anonymous', () => {
    const u = {
      id: 'x',
      identities: [{ provider: 'anonymous' }, { provider: 'google' }],
    } as User;
    expect(isAnonymousUser(u)).toBe(false);
  });

  it('returns false when identities empty', () => {
    const u = { id: 'x', identities: [] } as User;
    expect(isAnonymousUser(u)).toBe(false);
  });
});

describe('ensureSnapshotSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockSetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it('returns existing access_token from session', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok-abc' } },
    });
    await expect(ensureSnapshotSession()).resolves.toBe('tok-abc');
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('restores session from local backup when getSession is empty', async () => {
    localStorage.setItem(
      GLC_PREVIEW_GUEST_SESSION_KEY,
      JSON.stringify({ access_token: 'bak-at', refresh_token: 'bak-rt' }),
    );
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'restored-at',
          refresh_token: 'restored-rt',
          user: { id: 'guest-1', is_anonymous: true } as User,
        },
      },
      error: null,
    });
    await expect(ensureSnapshotSession()).resolves.toBe('restored-at');
    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'bak-at',
      refresh_token: 'bak-rt',
    });
  });

  it('returns empty string when backup restore fails', async () => {
    localStorage.setItem(
      GLC_PREVIEW_GUEST_SESSION_KEY,
      JSON.stringify({ access_token: 'bad', refresh_token: 'bad' }),
    );
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSetSession.mockResolvedValue({ data: { session: null }, error: { message: 'invalid' } });
    await expect(ensureSnapshotSession()).resolves.toBe('');
    expect(localStorage.getItem(GLC_PREVIEW_GUEST_SESSION_KEY)).toBeNull();
  });

  it('returns empty string when no session and no backup', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await expect(ensureSnapshotSession()).resolves.toBe('');
  });

  it('coalesces parallel callers into a single getSession chain', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    let release: () => void;
    const barrier = new Promise<void>((r) => {
      release = r;
    });
    mockSetSession.mockImplementation(async () => {
      await barrier;
      return {
        data: {
          session: {
            access_token: 'single',
            refresh_token: 'rt',
            user: { id: 'guest-1', is_anonymous: true } as User,
          },
        },
        error: null,
      };
    });
    localStorage.setItem(
      GLC_PREVIEW_GUEST_SESSION_KEY,
      JSON.stringify({ access_token: 'bak-at', refresh_token: 'bak-rt' }),
    );

    const a = ensureSnapshotSession();
    const b = ensureSnapshotSession();
    release!();
    await expect(Promise.all([a, b])).resolves.toEqual(['single', 'single']);
    expect(mockSetSession).toHaveBeenCalledTimes(1);
  });
});

describe('getSnapshotAccessToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('returns null when no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await expect(getSnapshotAccessToken()).resolves.toBeNull();
  });

  it('returns token when present', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'x' } },
    });
    await expect(getSnapshotAccessToken()).resolves.toBe('x');
  });
});
