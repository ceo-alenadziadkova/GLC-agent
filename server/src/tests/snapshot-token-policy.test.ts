import { describe, expect, it } from 'vitest';
import { isSnapshotTokenExpired, isSnapshotTokenFormatValid } from '../snapshot/domain/snapshot-token-policy.js';

describe('snapshot token policy', () => {
  it('rejects empty and non-uuid tokens', () => {
    expect(isSnapshotTokenFormatValid('')).toBe(false);
    expect(isSnapshotTokenFormatValid('not-a-uuid')).toBe(false);
    expect(isSnapshotTokenFormatValid('550e8400-e29b-41d4-a716-44665544000')).toBe(false);
  });

  it('validates UUIDv4 token format', () => {
    expect(isSnapshotTokenFormatValid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isSnapshotTokenFormatValid('550e8400-e29b-11d4-a716-446655440000')).toBe(false);
  });

  it('marks token expired when created_at is invalid', () => {
    expect(isSnapshotTokenExpired('invalid', 24, Date.now())).toBe(true);
  });

  it('marks token expired when age exceeds ttl', () => {
    const now = new Date('2026-04-16T12:00:00.000Z').getTime();
    expect(isSnapshotTokenExpired('2026-04-15T10:59:59.000Z', 24, now)).toBe(true);
    expect(isSnapshotTokenExpired('2026-04-15T12:30:00.000Z', 24, now)).toBe(false);
  });
});
