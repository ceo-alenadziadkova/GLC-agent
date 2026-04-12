/**
 * Redirect-following fetch must re-validate each hop (snapshot SSRF matrix).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('undici', async (importOriginal) => {
  const actual = await importOriginal<typeof import('undici')>();
  return {
    ...actual,
    fetch: vi.fn(),
  };
});

import dns from 'node:dns/promises';
import type { LookupAddress } from 'node:dns';
import * as undici from 'undici';
import { fetchPublicHttpUrl, PublicUrlNotAllowedError } from '../lib/public-http-url.js';

function mockDnsLookupAll(records: LookupAddress[]): typeof dns.lookup {
  return (async () => records) as unknown as typeof dns.lookup;
}

describe('fetchPublicHttpUrl', () => {
  beforeEach(() => {
    vi.spyOn(dns, 'lookup').mockImplementation(mockDnsLookupAll([{ address: '8.8.8.8', family: 4 }]));
    vi.mocked(undici.fetch).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects redirect Location that points to SSRF-blocked literal', async () => {
    vi.mocked(undici.fetch).mockImplementation(
      (async () =>
        new Response(null, {
          status: 302,
          headers: { Location: 'http://127.0.0.1/pwn' },
        })) as unknown as typeof undici.fetch,
    );

    await expect(fetchPublicHttpUrl('https://public-hop.example/start')).rejects.toThrow(PublicUrlNotAllowedError);
  });

  it('rejects redirect chain after max hops', async () => {
    vi.mocked(undici.fetch).mockImplementation(
      (async (input: string | URL | Request) => {
        const u = String(input instanceof Request ? input.url : input);
        const n = (u.match(/\/r(\d+)/)?.[1] ?? '0').replace(/\D/g, '');
        const next = Number(n) + 1;
        return new Response(null, {
          status: 302,
          headers: { Location: `https://public-hop.example/r${next}` },
        });
      }) as unknown as typeof undici.fetch,
    );

    await expect(fetchPublicHttpUrl('https://public-hop.example/r0')).rejects.toThrow(PublicUrlNotAllowedError);
  });

  it('rejects non-http Location scheme on redirect', async () => {
    vi.mocked(undici.fetch).mockImplementation(
      (async () =>
        new Response(null, {
          status: 302,
          headers: { Location: 'ftp://public-hop.example/file' },
        })) as unknown as typeof undici.fetch,
    );

    await expect(fetchPublicHttpUrl('https://public-hop.example/a')).rejects.toThrow(PublicUrlNotAllowedError);
  });

  it('rejects redirect target when DNS resolves to a private address (per-hop SSRF)', async () => {
    vi.spyOn(dns, 'lookup').mockImplementation(
      (async (hostname: string) => {
        if (String(hostname).toLowerCase().includes('private-target')) {
          return [{ address: '10.0.0.2', family: 4 }];
        }
        return [{ address: '8.8.8.8', family: 4 }];
      }) as unknown as typeof dns.lookup,
    );

    vi.mocked(undici.fetch).mockImplementation(
      (async (input: string | URL | Request) => {
        const u = String(input instanceof Request ? input.url : input);
        if (u.includes('start-ssrf.example')) {
          return new Response(null, {
            status: 302,
            headers: { Location: 'https://private-target.example.internal/next' },
          });
        }
        return new Response('ok', { status: 200 });
      }) as unknown as typeof undici.fetch,
    );

    await expect(fetchPublicHttpUrl('https://start-ssrf.example/')).rejects.toThrow(PublicUrlNotAllowedError);
  });
});
