import { describe, it, expect, vi, afterEach } from 'vitest';
import dns from 'node:dns/promises';
import type { LookupAddress } from 'node:dns';
import {
  validatePublicAuditUrl,
  PublicUrlNotAllowedError,
} from '../lib/public-http-url.js';
import { API_ERROR_CODES } from '../config/api-error-codes.js';

function mockDnsLookupAll(records: LookupAddress[]): typeof dns.lookup {
  return (async () => records) as unknown as typeof dns.lookup;
}

describe('validatePublicAuditUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('rejects localhost hostname', async () => {
    await expect(validatePublicAuditUrl('http://localhost/')).rejects.toMatchObject({
      code: API_ERROR_CODES.PUBLIC_URL_HOST_NOT_ALLOWED,
    });
  });

  it('rejects 127.0.0.1', async () => {
    await expect(validatePublicAuditUrl('http://127.0.0.1/')).rejects.toMatchObject({
      code: API_ERROR_CODES.PUBLIC_URL_ADDRESS_NOT_PUBLIC,
    });
  });

  it('rejects private IPv4 literal', async () => {
    await expect(validatePublicAuditUrl('http://10.0.0.1/')).rejects.toMatchObject({
      code: API_ERROR_CODES.PUBLIC_URL_ADDRESS_NOT_PUBLIC,
    });
  });

  it('rejects URL with credentials', async () => {
    await expect(validatePublicAuditUrl('https://user:pass@example.com/')).rejects.toMatchObject({
      code: API_ERROR_CODES.PUBLIC_URL_CREDENTIALS_NOT_ALLOWED,
    });
  });

  it('rejects non-http protocols', async () => {
    await expect(validatePublicAuditUrl('ftp://example.com/')).rejects.toMatchObject({
      code: API_ERROR_CODES.PUBLIC_URL_PROTOCOL_NOT_ALLOWED,
    });
  });

  it('rejects .local hostnames', async () => {
    await expect(validatePublicAuditUrl('http://printer.local/')).rejects.toMatchObject({
      code: API_ERROR_CODES.PUBLIC_URL_HOST_NOT_ALLOWED,
    });
  });

  it('rejects IPv6 loopback literal', async () => {
    await expect(validatePublicAuditUrl('http://[::1]/')).rejects.toMatchObject({
      code: API_ERROR_CODES.PUBLIC_URL_ADDRESS_NOT_PUBLIC,
    });
  });

  it('rejects link-local IPv4 literal', async () => {
    await expect(validatePublicAuditUrl('http://169.254.169.254/')).rejects.toMatchObject({
      code: API_ERROR_CODES.PUBLIC_URL_ADDRESS_NOT_PUBLIC,
    });
  });

  it('rejects hostname whose DNS resolves only to private IPv4 (rebinding guard)', async () => {
    vi.spyOn(dns, 'lookup').mockImplementation(mockDnsLookupAll([{ address: '10.0.0.1', family: 4 }]));
    await expect(validatePublicAuditUrl('https://snapshot-ssrf-test.example/')).rejects.toMatchObject({
      code: API_ERROR_CODES.PUBLIC_URL_DNS_NON_PUBLIC,
    });
  });
});
