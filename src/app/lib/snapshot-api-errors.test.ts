import { describe, it, expect } from 'vitest';
import { toRetrySeconds, formatWaitTime, toUiErrorMessage } from './snapshot-api-errors';

describe('toRetrySeconds', () => {
  it('prefers retry_after_seconds', () => {
    expect(toRetrySeconds({ retry_after_seconds: 90 })).toBe(90);
  });

  it('converts minutes', () => {
    expect(toRetrySeconds({ retry_after_minutes: 2 })).toBe(120);
  });

  it('converts hours', () => {
    expect(toRetrySeconds({ retry_after_hours: 1 })).toBe(3600);
  });

  it('returns null when nothing positive', () => {
    expect(toRetrySeconds({})).toBeNull();
    expect(toRetrySeconds({ retry_after_seconds: 0 })).toBeNull();
  });
});

describe('formatWaitTime', () => {
  it('formats under one minute', () => {
    expect(formatWaitTime(45)).toBe('45s');
  });

  it('formats minutes', () => {
    expect(formatWaitTime(120)).toBe('2 min');
  });

  it('formats hours for long waits', () => {
    expect(formatWaitTime(7200)).toBe('2 h');
  });
});

describe('toUiErrorMessage', () => {
  it('maps 401/403', () => {
    expect(toUiErrorMessage(401, {}, 'x')).toBe(
      'Session expired or invalid. Refresh the page and sign in again.',
    );
  });

  it('maps 429 with API message and wait hint', () => {
    const msg = toUiErrorMessage(429, { error: 'Slow down', retry_after_seconds: 30 }, 'fb');
    expect(msg).toContain('Slow down');
    expect(msg).toContain('30s');
  });

  it('maps 5xx without a client-safe body to a generic server message', () => {
    expect(toUiErrorMessage(500, {}, 'x')).toBe(
      'Server error while starting analysis. Please try again in a minute.',
    );
    expect(toUiErrorMessage(502, {}, 'x')).toBe(
      'Server error while starting analysis. Please try again in a minute.',
    );
  });

  it('maps 502/504 with API error to that message', () => {
    expect(toUiErrorMessage(502, { error: 'Upstream timeout' }, 'fb')).toBe('Upstream timeout');
  });

  it('hides self-serve owner details for 503 even if error body leaked', () => {
    expect(
      toUiErrorMessage(
        503,
        {
          error: 'INTERNAL: set self_serve_audit_owner_user_id',
          code: 'SELF_SERVE_OWNER_UNAVAILABLE',
        },
        'fb',
      ),
    ).toBe('This feature is temporarily unavailable. Please try again in a few minutes.');
  });

  it('maps 503 with API error when not owner-unavailable', () => {
    expect(toUiErrorMessage(503, { error: 'Maintenance window' }, 'fb')).toBe('Maintenance window');
  });

  it('maps 503 without API error to an unavailable fallback', () => {
    expect(toUiErrorMessage(503, {}, 'fb')).toBe(
      'This feature is temporarily unavailable. Please try again in a few minutes.',
    );
  });

  it('falls back for other statuses', () => {
    expect(toUiErrorMessage(400, {}, 'fallback')).toBe('fallback');
    expect(toUiErrorMessage(400, { error: ' bad ' }, 'fb')).toBe('bad');
  });
});
