import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from '../services/logger.js';

describe('logger sanitization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redacts sensitive keys and email-like values in context', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const testToken = 'token_for_test_only_not_a_real_secret';
    logger.info('orchestration.test_metric', {
      email: 'user@example.com',
      accessToken: testToken,
      detail: `contact user@example.com and use Bearer ${testToken}`,
    });
    expect(logSpy).toHaveBeenCalledTimes(1);
    const message = String(logSpy.mock.calls[0]?.[0] ?? '');
    expect(message).toContain('[REDACTED_EMAIL]');
    expect(message).toContain('[REDACTED_SECRET]');
    expect(message).not.toContain('user@example.com');
    expect(message).not.toContain(testToken);
  });
});
