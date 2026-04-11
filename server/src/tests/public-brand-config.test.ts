import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getPublicBrandConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('merges PUBLIC_* env overrides over dev defaults', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('GLC_PUBLIC_SITE_URL', 'https://brand.example');
    vi.stubEnv('PUBLIC_BRAND_NAME', 'Acme Audits');
    vi.stubEnv('PUBLIC_SUPPORT_EMAIL', 'hello@acme.test');
    vi.stubEnv('PUBLIC_BRAND_LEGAL_LINE', 'London · UK');
    const { getPublicBrandConfig } = await import('../config/public-brand-config.js');
    const c = getPublicBrandConfig();
    expect(c.brand_name).toBe('Acme Audits');
    expect(c.support_email).toBe('hello@acme.test');
    expect(c.public_site_url).toBe('https://brand.example');
    expect(c.footer.brandTitle).toBe('Acme Audits');
    expect(c.footer.legalLine).toBe('London · UK');
  });

  it('production: support_email null when PUBLIC_SUPPORT_EMAIL unset', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('GLC_PUBLIC_SITE_URL', 'https://prod.example');
    vi.stubEnv('PUBLIC_SUPPORT_EMAIL', '');
    const { getPublicBrandConfig } = await import('../config/public-brand-config.js');
    const c = getPublicBrandConfig();
    expect(c.support_email).toBeNull();
  });
});
