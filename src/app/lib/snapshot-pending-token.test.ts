import { afterEach, describe, expect, it } from 'vitest';
import {
  clearPendingSnapshotToken,
  getPendingSnapshotToken,
  GLC_PENDING_SNAPSHOT_TOKEN_KEY,
  setPendingSnapshotToken,
} from './snapshot-pending-token';

describe('snapshot-pending-token', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('stores, reads, and clears pending snapshot token', () => {
    setPendingSnapshotToken('token-xyz');
    expect(localStorage.getItem(GLC_PENDING_SNAPSHOT_TOKEN_KEY)).toBe('token-xyz');
    expect(getPendingSnapshotToken()).toBe('token-xyz');
    clearPendingSnapshotToken();
    expect(getPendingSnapshotToken()).toBeNull();
  });
});
