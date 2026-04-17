import { ApiError, api } from '../../../data/apiService';
import { logger } from '../../../lib/logger';
import { GLC_DISCOVERY_SESSION_TOKEN_STORAGE_KEY } from '../../../lib/storage-keys';
import { clearPendingSnapshotToken, getPendingSnapshotToken } from '../../../lib/snapshot-pending-token';
import { resolvePostLoginPath } from '../domain/login-navigation-policy';

async function claimPendingSnapshotIfNeeded(): Promise<void> {
  const pendingSnapshot = getPendingSnapshotToken();
  if (!pendingSnapshot) {
    return;
  }

  try {
    await api.claimSnapshot(pendingSnapshot);
    clearPendingSnapshotToken();
    logger.info('Login: pending snapshot claimed');
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 409 || error.status === 410)) {
      clearPendingSnapshotToken();
    }
    logger.warn('Login: snapshot claim failed', {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function hasDiscoverySessionToken(): boolean {
  return Boolean(localStorage.getItem(GLC_DISCOVERY_SESSION_TOKEN_STORAGE_KEY));
}

export async function resolveLoginRedirect(search: string): Promise<string> {
  await claimPendingSnapshotIfNeeded();
  const hasDiscoveryToken = hasDiscoverySessionToken();
  const resolvedPath = resolvePostLoginPath({ search, hasDiscoveryToken });
  if (hasDiscoveryToken) {
    logger.info('Login: isAuthenticated with discovery token, navigating to /audit/new');
  } else {
    logger.info('Login: isAuthenticated, navigating to post-login route', { next: resolvedPath });
  }
  return resolvedPath;
}
