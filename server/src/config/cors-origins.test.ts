import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCorsAllowedOrigins } from './cors-origins.js';

describe('getCorsAllowedOrigins', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('merges ALLOWED_ORIGINS and FRONTEND_URL in production with dedupe and trims slashes', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOWED_ORIGINS', 'https://a.test, https://b.test/ ');
    vi.stubEnv('FRONTEND_URL', 'https://a.test/');
    expect(getCorsAllowedOrigins().sort()).toEqual(['https://a.test', 'https://b.test']);
  });

  it('production: empty when no env set', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(getCorsAllowedOrigins()).toEqual([]);
  });

  it('development: includes localhost defaults and extra allowlist', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ALLOWED_ORIGINS', 'https://preview.example.com');
    vi.stubEnv('FRONTEND_URL', '');
    const list = getCorsAllowedOrigins();
    expect(list).toContain('http://localhost:5173');
    expect(list).toContain('https://preview.example.com');
  });
});
