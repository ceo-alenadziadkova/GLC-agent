import { describe, it, expect, vi, afterEach } from 'vitest';
import dns from 'node:dns/promises';
import {
  validatePublicAuditUrl,
  PublicUrlNotAllowedError,
} from '../lib/public-http-url.js';

describe('validatePublicAuditUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
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

  it('rejects IPv6 loopback literal', async () => {
    await expect(validatePublicAuditUrl('http://[::1]/')).rejects.toThrow(PublicUrlNotAllowedError);
  });

  it('rejects link-local IPv4 literal', async () => {
    await expect(validatePublicAuditUrl('http://169.254.169.254/')).rejects.toThrow(PublicUrlNotAllowedError);
  });

  it('rejects hostname whose DNS resolves only to private IPv4 (rebinding guard)', async () => {
    vi.spyOn(dns, 'lookup').mockResolvedValue([{ address: '10.0.0.1', family: 4 }] as dns.LookupAddress[]);
    await expect(validatePublicAuditUrl('https://snapshot-ssrf-test.example/')).rejects.toThrow(
      PublicUrlNotAllowedError,
    );
  });
});
