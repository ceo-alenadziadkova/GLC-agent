import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../data/api-error';
import { APP_ROUTE_PATHS, buildAppRoute } from '../../../config/route-paths';
import { GLC_DISCOVERY_SESSION_TOKEN_STORAGE_KEY } from '../../../lib/storage-keys';
import { GLC_PENDING_SNAPSHOT_TOKEN_KEY, setPendingSnapshotToken } from '../../../lib/snapshot-pending-token';

const mocks = vi.hoisted(() => ({
  claimSnapshot: vi.fn(),
}));

vi.mock('../../../data/apiService', () => ({
  ApiError,
  api: {
    claimSnapshot: mocks.claimSnapshot,
  },
}));

vi.mock('../../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('resolveLoginRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('navigates to portfolio when no pending snapshot and no next param', async () => {
    const { resolveLoginRedirect } = await import('./login-session-reconcile-service');
    await expect(resolveLoginRedirect('')).resolves.toBe(APP_ROUTE_PATHS.portfolio);
    expect(mocks.claimSnapshot).not.toHaveBeenCalled();
  });

  it('respects safe next path from query', async () => {
    const { resolveLoginRedirect } = await import('./login-session-reconcile-service');
    await expect(resolveLoginRedirect('?next=%2Fdashboard')).resolves.toBe('/dashboard');
    expect(mocks.claimSnapshot).not.toHaveBeenCalled();
  });

  it('ignores open-redirect style next values', async () => {
    const { resolveLoginRedirect } = await import('./login-session-reconcile-service');
    await expect(resolveLoginRedirect('?next=https%3A%2F%2Fevil.test')).resolves.toBe(APP_ROUTE_PATHS.portfolio);
  });

  it('ignores next pointing at login', async () => {
    const { resolveLoginRedirect } = await import('./login-session-reconcile-service');
    await expect(resolveLoginRedirect(`?next=${encodeURIComponent(APP_ROUTE_PATHS.login)}`)).resolves.toBe(
      APP_ROUTE_PATHS.portfolio,
    );
  });

  it('claims pending snapshot, clears storage, then resolves path', async () => {
    setPendingSnapshotToken('snap-token-1');
    mocks.claimSnapshot.mockResolvedValue({ ok: true, audit_id: 'a1', already_claimed: false });
    const { resolveLoginRedirect } = await import('./login-session-reconcile-service');
    await expect(resolveLoginRedirect('')).resolves.toBe(APP_ROUTE_PATHS.portfolio);
    expect(mocks.claimSnapshot).toHaveBeenCalledWith('snap-token-1');
    expect(localStorage.getItem(GLC_PENDING_SNAPSHOT_TOKEN_KEY)).toBeNull();
  });

  it('clears pending token on ApiError 404', async () => {
    setPendingSnapshotToken('snap-token-404');
    mocks.claimSnapshot.mockRejectedValue(new ApiError('not found', 404));
    const { resolveLoginRedirect } = await import('./login-session-reconcile-service');
    await expect(resolveLoginRedirect('')).resolves.toBe(APP_ROUTE_PATHS.portfolio);
    expect(localStorage.getItem(GLC_PENDING_SNAPSHOT_TOKEN_KEY)).toBeNull();
  });

  it('clears pending token on ApiError 409', async () => {
    setPendingSnapshotToken('snap-token-409');
    mocks.claimSnapshot.mockRejectedValue(new ApiError('conflict', 409));
    const { resolveLoginRedirect } = await import('./login-session-reconcile-service');
    await expect(resolveLoginRedirect('')).resolves.toBe(APP_ROUTE_PATHS.portfolio);
    expect(localStorage.getItem(GLC_PENDING_SNAPSHOT_TOKEN_KEY)).toBeNull();
  });

  it('clears pending token on ApiError 410', async () => {
    setPendingSnapshotToken('snap-token-410');
    mocks.claimSnapshot.mockRejectedValue(new ApiError('gone', 410));
    const { resolveLoginRedirect } = await import('./login-session-reconcile-service');
    await expect(resolveLoginRedirect('')).resolves.toBe(APP_ROUTE_PATHS.portfolio);
    expect(localStorage.getItem(GLC_PENDING_SNAPSHOT_TOKEN_KEY)).toBeNull();
  });

  it('keeps pending token on ApiError other than 404/409/410', async () => {
    setPendingSnapshotToken('snap-token-401');
    mocks.claimSnapshot.mockRejectedValue(new ApiError('unauthorized', 401));
    const { resolveLoginRedirect } = await import('./login-session-reconcile-service');
    await expect(resolveLoginRedirect('')).resolves.toBe(APP_ROUTE_PATHS.portfolio);
    expect(localStorage.getItem(GLC_PENDING_SNAPSHOT_TOKEN_KEY)).toBe('snap-token-401');
  });

  it('keeps pending token on non-ApiError failures', async () => {
    setPendingSnapshotToken('snap-token-generic');
    mocks.claimSnapshot.mockRejectedValue(new Error('network'));
    const { resolveLoginRedirect } = await import('./login-session-reconcile-service');
    await expect(resolveLoginRedirect('')).resolves.toBe(APP_ROUTE_PATHS.portfolio);
    expect(localStorage.getItem(GLC_PENDING_SNAPSHOT_TOKEN_KEY)).toBe('snap-token-generic');
  });

  it('prefers discovery session route over next param', async () => {
    localStorage.setItem(GLC_DISCOVERY_SESSION_TOKEN_STORAGE_KEY, 'disc-1');
    const { resolveLoginRedirect } = await import('./login-session-reconcile-service');
    await expect(resolveLoginRedirect('?next=%2Fsettings')).resolves.toBe(buildAppRoute.auditNewFromDiscovery());
    expect(mocks.claimSnapshot).not.toHaveBeenCalled();
  });

  it('runs snapshot claim before discovery redirect when both are present', async () => {
    localStorage.setItem(GLC_DISCOVERY_SESSION_TOKEN_STORAGE_KEY, 'disc-1');
    setPendingSnapshotToken('snap-both');
    mocks.claimSnapshot.mockResolvedValue({ ok: true, audit_id: 'a1', already_claimed: false });
    const { resolveLoginRedirect } = await import('./login-session-reconcile-service');
    await expect(resolveLoginRedirect('')).resolves.toBe(buildAppRoute.auditNewFromDiscovery());
    expect(mocks.claimSnapshot).toHaveBeenCalledWith('snap-both');
    expect(localStorage.getItem(GLC_PENDING_SNAPSHOT_TOKEN_KEY)).toBeNull();
  });
});
