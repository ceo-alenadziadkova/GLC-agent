/** After a public snapshot starts, stored until the user signs in and POST /api/snapshot/claim runs. */
export const GLC_PENDING_SNAPSHOT_TOKEN_KEY = 'glc_pending_snapshot_token';

export function setPendingSnapshotToken(token: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(GLC_PENDING_SNAPSHOT_TOKEN_KEY, token);
  } catch {
    /* ignore quota */
  }
}

export function getPendingSnapshotToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(GLC_PENDING_SNAPSHOT_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearPendingSnapshotToken(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(GLC_PENDING_SNAPSHOT_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
