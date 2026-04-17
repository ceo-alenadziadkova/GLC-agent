import { isSnapshotTokenFormatValid } from '../domain/snapshot-token-policy.js';

export function parseSnapshotToken(value: unknown): string | null {
  const token = typeof value === 'string' ? value.trim() : '';
  if (!token || !isSnapshotTokenFormatValid(token)) {
    return null;
  }
  return token;
}
