import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getPublicBrandConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns brand copy from public-brand-defaults.v1.json and public_site_url from env', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('GLC_PUBLIC_SITE_URL', 'https://brand.example');
    const { getPublicBrandConfig } = await import('../config/public-brand-config.js');
    const c = getPublicBrandConfig();
    expect(c.brand_name).toBe('GLC Tech');
    expect(c.public_site_url).toBe('https://brand.example');
    expect(c.footer.brandTitle).toBe('GLC Tech');
    expect(c.footer.introParagraph).toContain('Audits of digital systems');
    expect(c.support_email).toMatch(/@/);
  });

  it('production: support_email null when JSON support_email is null', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('GLC_PUBLIC_SITE_URL', 'https://prod.example');
    const { getPublicBrandConfig } = await import('../config/public-brand-config.js');
    const c = getPublicBrandConfig();
    expect(c.support_email).toBeNull();
  });
});
