/**
 * Redirect-following fetch must re-validate each hop (snapshot SSRF matrix).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import dns from 'node:dns/promises';
import { fetchPublicHttpUrl, PublicUrlNotAllowedError } from '../lib/public-http-url.js';

describe('fetchPublicHttpUrl', () => {
  beforeEach(() => {
    vi.spyOn(dns, 'lookup').mockResolvedValue([{ address: '8.8.8.8', family: 4 }] as dns.LookupAddress[]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('rejects redirect Location that points to SSRF-blocked literal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: string | URL) => {
        return new Response(null, {
          status: 302,
          headers: { Location: 'http://127.0.0.1/pwn' },
        });
      }) as unknown as typeof fetch,
    );

    await expect(fetchPublicHttpUrl('https://public-hop.example/start')).rejects.toThrow(PublicUrlNotAllowedError);
  });

  it('rejects redirect chain after max hops', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        const u = String(input);
        const n = (u.match(/\/r(\d+)/)?.[1] ?? '0').replace(/\D/g, '');
        const next = Number(n) + 1;
        return new Response(null, {
          status: 302,
          headers: { Location: `https://public-hop.example/r${next}` },
        });
      }) as unknown as typeof fetch,
    );

    await expect(fetchPublicHttpUrl('https://public-hop.example/r0')).rejects.toThrow(PublicUrlNotAllowedError);
  });

  it('rejects non-http Location scheme on redirect', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(null, {
          status: 302,
          headers: { Location: 'ftp://public-hop.example/file' },
        });
      }) as unknown as typeof fetch,
    );

    await expect(fetchPublicHttpUrl('https://public-hop.example/a')).rejects.toThrow(PublicUrlNotAllowedError);
  });

  it('rejects redirect target when DNS resolves to a private address (per-hop SSRF)', async () => {
    vi.spyOn(dns, 'lookup').mockImplementation(async (hostname: string) => {
      if (String(hostname).toLowerCase().includes('private-target')) {
        return [{ address: '10.0.0.2', family: 4 }] as dns.LookupAddress[];
      }
      return [{ address: '8.8.8.8', family: 4 }] as dns.LookupAddress[];
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        const u = String(input);
        if (u.includes('start-ssrf.example')) {
          return new Response(null, {
            status: 302,
            headers: { Location: 'https://private-target.example.internal/next' },
          });
        }
        return new Response('ok', { status: 200 });
      }) as unknown as typeof fetch,
    );

    await expect(fetchPublicHttpUrl('https://start-ssrf.example/')).rejects.toThrow(PublicUrlNotAllowedError);
  });
});
