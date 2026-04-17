import { describe, expect, it } from 'vitest';
import type { SnapshotApiErrorPayload } from '../../../lib/snapshot-api-errors';
import {
  parseRateLimitFromPayload,
  parseRateLimitHeaders,
  type RateLimitNumbers,
} from './snapshotLandingClient';

describe('snapshotLandingClient rate-limit parsing', () => {
  it('parseRateLimitHeaders returns numbers when headers are valid', () => {
    const headers = new Headers({
      'RateLimit-Limit': '10',
      'RateLimit-Remaining': '3',
    });

    expect(parseRateLimitHeaders(headers)).toEqual({ limit: 10, remaining: 3 } satisfies RateLimitNumbers);
  });

  it('parseRateLimitHeaders returns null when headers are missing', () => {
    const headers = new Headers({
      'RateLimit-Limit': '10',
    });
    expect(parseRateLimitHeaders(headers)).toBeNull();
  });

  it('parseRateLimitFromPayload returns numbers and defaults remaining to 0', () => {
    const payload: SnapshotApiErrorPayload = { error: 'x', limit: 7 };
    expect(parseRateLimitFromPayload(payload)).toEqual({ limit: 7, remaining: 0 } satisfies RateLimitNumbers);
  });

  it('parseRateLimitFromPayload returns null when payload.limit is not a number', () => {
    const payload: SnapshotApiErrorPayload = { error: 'x', limit: undefined };
    expect(parseRateLimitFromPayload(payload)).toBeNull();
  });
});

