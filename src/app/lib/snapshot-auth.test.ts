import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { isAnonymousUser, ensureSnapshotSession, getSnapshotAccessToken } from './snapshot-auth';

const mockGetSession = vi.fn();
const mockSignInAnonymously = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signInAnonymously: () => mockSignInAnonymously(),
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
  });

  it('returns existing access_token from session', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok-abc' } },
    });
    await expect(ensureSnapshotSession()).resolves.toBe('tok-abc');
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
  });

  it('calls signInAnonymously when no token', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInAnonymously.mockResolvedValue({
      data: { session: { access_token: 'anon-tok' } },
      error: null,
    });
    await expect(ensureSnapshotSession()).resolves.toBe('anon-tok');
  });

  it('throws when anonymous sign-in fails', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInAnonymously.mockResolvedValue({
      data: { session: null },
      error: { message: 'Anonymous disabled' },
    });
    await expect(ensureSnapshotSession()).rejects.toThrow(/Anonymous disabled/);
  });

  it('throws when anonymous session has no token', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInAnonymously.mockResolvedValue({
      data: { session: {} },
      error: null,
    });
    await expect(ensureSnapshotSession()).rejects.toThrow(/Could not start a preview session/);
  });
});

describe('getSnapshotAccessToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
