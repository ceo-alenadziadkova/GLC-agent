import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getApiBaseUrl', () => {
  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('prefixes https when VITE_API_URL is host without protocol', async () => {
    vi.stubEnv('VITE_API_URL', 'api.example.com');
    vi.stubEnv('DEV', true);
    vi.stubEnv('PROD', false);
    const { getApiBaseUrl } = await import('./api-base-url.js');
    expect(getApiBaseUrl()).toBe('https://api.example.com');
  });

  it('strips trailing slashes from absolute URL', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/');
    vi.stubEnv('DEV', true);
    const { getApiBaseUrl } = await import('./api-base-url.js');
    expect(getApiBaseUrl()).toBe('https://api.example.com');
  });

  it('throws in production when VITE_API_URL is empty', async () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('PROD', true);
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_API_URL', '');
    const { getApiBaseUrl } = await import('./api-base-url.js');
    expect(() => getApiBaseUrl()).toThrow(/VITE_API_URL is required/);
  });
});
