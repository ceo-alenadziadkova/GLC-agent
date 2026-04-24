import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/public-http-url.js', () => ({
  PublicUrlNotAllowedError: class PublicUrlNotAllowedError extends Error {
    code = 'PUBLIC_URL_NOT_ALLOWED';
  },
  validatePublicAuditUrl: vi.fn(async (url: string) => url),
}));

import { NO_PUBLIC_WEBSITE_URL } from '../config/no-public-website.js';
import { resolveCreateAuditCompanyUrl } from '../services/audits/audits-create.service.js';

describe('resolveCreateAuditCompanyUrl', () => {
  it('returns sentinel URL when no_public_website is true and company_url is omitted', async () => {
    const result = await resolveCreateAuditCompanyUrl({
      noPublicWebsite: true,
      companyUrl: undefined,
    });
    expect(result).toEqual({ ok: true, url: NO_PUBLIC_WEBSITE_URL });
  });

  it('returns omit_company_url when no_public_website is true but user still provides company_url', async () => {
    const result = await resolveCreateAuditCompanyUrl({
      noPublicWebsite: true,
      companyUrl: 'https://example.com',
    });
    expect(result).toEqual({ ok: false, kind: 'omit_company_url' });
  });

  it('returns company_url_required when no_public_website is false and company_url is missing', async () => {
    const result = await resolveCreateAuditCompanyUrl({
      noPublicWebsite: false,
      companyUrl: '',
    });
    expect(result).toEqual({ ok: false, kind: 'company_url_required' });
  });
});
