import { describe, it, expect } from 'vitest';
import {
  validatePublicAuditUrl,
  PublicUrlNotAllowedError,
} from '../lib/public-http-url.js';

describe('validatePublicAuditUrl', () => {
  it('rejects localhost hostname', async () => {
    await expect(validatePublicAuditUrl('http://localhost/')).rejects.toThrow(PublicUrlNotAllowedError);
  });

  it('rejects 127.0.0.1', async () => {
    await expect(validatePublicAuditUrl('http://127.0.0.1/')).rejects.toThrow(PublicUrlNotAllowedError);
  });

  it('rejects private IPv4 literal', async () => {
    await expect(validatePublicAuditUrl('http://10.0.0.1/')).rejects.toThrow(PublicUrlNotAllowedError);
  });

  it('rejects URL with credentials', async () => {
    await expect(validatePublicAuditUrl('https://user:pass@example.com/')).rejects.toThrow(
      PublicUrlNotAllowedError
    );
  });

  it('rejects non-http protocols', async () => {
    await expect(validatePublicAuditUrl('ftp://example.com/')).rejects.toThrow(PublicUrlNotAllowedError);
  });

  it('rejects .local hostnames', async () => {
    await expect(validatePublicAuditUrl('http://printer.local/')).rejects.toThrow(PublicUrlNotAllowedError);
  });
});
