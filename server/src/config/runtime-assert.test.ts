import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertProductionRuntimeConfig } from './runtime-assert.js';

describe('assertProductionRuntimeConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws when CORS allowlist is empty despite FRONTEND_URL being set (e.g. FRONTEND_URL normalizes to empty)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('FRONTEND_URL', '/');
    vi.stubEnv('GLC_PUBLIC_SITE_URL', 'https://valid.example');
    vi.stubEnv('ALLOWED_ORIGINS', '');
    expect(() => assertProductionRuntimeConfig()).toThrow(/CORS allowlist is empty/);
  });

  it('does not throw when FRONTEND_URL yields at least one CORS origin', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('FRONTEND_URL', 'https://app.example.com');
    vi.stubEnv('GLC_PUBLIC_SITE_URL', 'https://app.example.com');
    vi.stubEnv('ALLOWED_ORIGINS', '');
    expect(() => assertProductionRuntimeConfig()).not.toThrow();
  });
});
