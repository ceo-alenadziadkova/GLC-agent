/**
 * Behaviour: human-readable relative timestamps for activity UI (see relativeTime.ts).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatRelativeTime } from './relativeTime';

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-07T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('treats future timestamps as just now', () => {
    expect(formatRelativeTime('2026-04-07T12:05:00.000Z')).toBe('just now');
  });

  it('returns just now under 60 seconds', () => {
    expect(formatRelativeTime('2026-04-07T11:59:30.000Z')).toBe('just now');
  });

  it('formats minutes', () => {
    expect(formatRelativeTime('2026-04-07T11:58:00.000Z')).toBe('2m ago');
  });

  it('formats hours', () => {
    expect(formatRelativeTime('2026-04-07T09:00:00.000Z')).toBe('3h ago');
  });

  it('formats days', () => {
    expect(formatRelativeTime('2026-04-04T12:00:00.000Z')).toBe('3d ago');
  });

  it('formats months (30-day buckets)', () => {
    expect(formatRelativeTime('2026-02-06T12:00:00.000Z')).toBe('2mo ago');
  });

  it('formats years', () => {
    expect(formatRelativeTime('2024-04-07T12:00:00.000Z')).toBe('2y ago');
  });
});
