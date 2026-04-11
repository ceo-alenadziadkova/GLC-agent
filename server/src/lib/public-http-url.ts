/**
 * SSRF mitigation: only allow http(s) URLs that resolve to public addresses.
 * Blocks loopback, RFC1918, link-local, CGNAT, credentials in URL, and obvious internal hostnames.
 */
import dns from 'node:dns/promises';
import { isIPv4, isIPv6, type LookupFunction } from 'node:net';
import { Agent, fetch as undiciFetch } from 'undici';
import { isNoPublicWebsiteUrl, NO_PUBLIC_WEBSITE_URL } from '../config/no-public-website.js';

export class PublicUrlNotAllowedError extends Error {
  override name = 'PublicUrlNotAllowedError';
  constructor(message: string) {
    super(message);
  }
}

function isPrivateOrBlockedIPv4(address: string): boolean {
  const parts = address.split('.').map(p => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateOrBlockedIPv6(address: string): boolean {
  const n = address.toLowerCase();
  if (n === '::1') return true;
  if (n.startsWith('fe80:')) return true;
  if (n.startsWith('fc') || n.startsWith('fd')) return true;
  if (n.startsWith('::ffff:')) {
    const v4 = n.slice(7);
    return isIPv4(v4) && isPrivateOrBlockedIPv4(v4);
  }
  return false;
}

function assertHostnameNotBlocked(hostname: string): void {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local')) {
    throw new PublicUrlNotAllowedError('Host is not allowed');
  }
}

/**
 * Validates URL for audit/crawl targets. Returns normalized href.
 * Resolves DNS on the server; reject if any A/AAAA is non-public.
 */
export async function validatePublicAuditUrl(urlString: string): Promise<string> {
  const trimmed = urlString.trim();
  if (isNoPublicWebsiteUrl(trimmed)) {
    return NO_PUBLIC_WEBSITE_URL;
  }

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    throw new PublicUrlNotAllowedError('Invalid URL');
  }

  if (u.username || u.password) {
    throw new PublicUrlNotAllowedError('URL must not contain credentials');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new PublicUrlNotAllowedError('Only http and https URLs are allowed');
  }

  const host = u.hostname;
  assertHostnameNotBlocked(host);

  if (isIPv4(host)) {
    if (isPrivateOrBlockedIPv4(host)) {
      throw new PublicUrlNotAllowedError('Address is not a public host');
    }
    return u.href;
  }
  if (isIPv6(host)) {
    const raw = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
    if (isPrivateOrBlockedIPv6(raw)) {
      throw new PublicUrlNotAllowedError('Address is not a public host');
    }
    return u.href;
  }

  let records: Array<{ address: string; family: number }>;
  try {
    records = await dns.lookup(host, { all: true });
  } catch {
    throw new PublicUrlNotAllowedError('Host does not resolve');
  }
  if (records.length === 0) {
    throw new PublicUrlNotAllowedError('Host does not resolve');
  }

  for (const r of records) {
    if (r.family === 4) {
      if (isPrivateOrBlockedIPv4(r.address)) {
        throw new PublicUrlNotAllowedError('Host resolves to a non-public address');
      }
    } else if (isPrivateOrBlockedIPv6(r.address)) {
      throw new PublicUrlNotAllowedError('Host resolves to a non-public address');
    }
  }

  return u.href;
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

async function resolvePublicIpForHost(host: string): Promise<{ address: string; family: 4 | 6 }> {
  if (isIPv4(host)) {
    if (isPrivateOrBlockedIPv4(host)) throw new PublicUrlNotAllowedError('Address is not a public host');
    return { address: host, family: 4 };
  }
  if (isIPv6(host)) {
    const raw = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
    if (isPrivateOrBlockedIPv6(raw)) throw new PublicUrlNotAllowedError('Address is not a public host');
    return { address: raw, family: 6 };
  }
  const records = await dns.lookup(host, { all: true });
  if (records.length === 0) throw new PublicUrlNotAllowedError('Host does not resolve');
  const selected = records.find((r) => {
    if (r.family === 4) return !isPrivateOrBlockedIPv4(r.address);
    return !isPrivateOrBlockedIPv6(r.address);
  });
  if (!selected || (selected.family !== 4 && selected.family !== 6)) {
    throw new PublicUrlNotAllowedError('Host resolves to a non-public address');
  }
  return { address: selected.address, family: selected.family };
}

function makePinnedAgent(pinnedAddress: string, family: 4 | 6): Agent {
  /**
   * Node's tls/net may call lookup with `{ all: true }` (autoSelectFamily). In that mode the
   * callback must receive `LookupAddress[]`, not `(address, family)` — otherwise the IP is
   * undefined and fetch fails with a generic "fetch failed".
   */
  const lookup: LookupFunction = (_hostname, opts, cb) => {
    const stillPublic = family === 4
      ? !isPrivateOrBlockedIPv4(pinnedAddress)
      : !isPrivateOrBlockedIPv6(pinnedAddress);
    if (!stillPublic) {
      cb(new PublicUrlNotAllowedError('IP class changed — DNS rebinding detected') as NodeJS.ErrnoException, '', family);
      return;
    }
    if (opts && typeof opts === 'object' && 'all' in opts && opts.all === true) {
      cb(null, [{ address: pinnedAddress, family }]);
    } else {
      cb(null, pinnedAddress, family);
    }
  };
  return new Agent({
    connect: { lookup },
  });
}

/**
 * Fetch wrapper with SSRF-safe redirect handling:
 * - validates each redirect Location before following
 * - caps redirect depth
 * - validates final response URL as a defense-in-depth check
 */
export async function fetchPublicHttpUrl(
  url: string,
  init: RequestInit = {},
  maxRedirects = 5
): Promise<Response> {
  if (isNoPublicWebsiteUrl(url.trim())) {
    throw new PublicUrlNotAllowedError('No public website');
  }

  let currentUrl = await validatePublicAuditUrl(url);
  const maxRetries = 3;
  const retryableStatus = new Set([408, 429, 500, 502, 503, 504, 529]);
  const methodsWithoutRetry = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
  const method = String(init.method ?? 'GET').toUpperCase();

  for (let hop = 0; hop <= maxRedirects; hop++) {
    let response: Response | null = null;
    let lastErr: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        currentUrl = await validatePublicAuditUrl(currentUrl);
        const current = new URL(currentUrl);
        const pinned = await resolvePublicIpForHost(current.hostname);
        const dispatcher = makePinnedAgent(pinned.address, pinned.family);
        const fetchInit = { ...(init as Record<string, unknown>), redirect: 'manual', dispatcher };
        // Must use undici's fetch with npm `undici` Agent — Node's global fetch uses a different
        // undici build and throws (e.g. "invalid onRequestStart method").
        response = await undiciFetch(currentUrl, fetchInit as Parameters<typeof undiciFetch>[1]);
        if (!retryableStatus.has(response.status) || methodsWithoutRetry.has(method) || attempt === maxRetries) {
          break;
        }
      } catch (err) {
        lastErr = err as Error;
        if (methodsWithoutRetry.has(method) || attempt === maxRetries) {
          throw lastErr;
        }
      }
      const backoffMs = 300 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 120);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
    if (!response) {
      throw lastErr ?? new PublicUrlNotAllowedError('Request failed');
    }

    if (isRedirectStatus(response.status)) {
      if (hop === maxRedirects) {
        throw new PublicUrlNotAllowedError('Too many redirects');
      }

      const location = response.headers.get('location');
      if (!location) {
        return response;
      }

      const nextUrl = new URL(location, currentUrl).href;
      currentUrl = await validatePublicAuditUrl(nextUrl);
      continue;
    }

    if (response.url) {
      await validatePublicAuditUrl(response.url);
    }
    return response;
  }

  throw new PublicUrlNotAllowedError('Too many redirects');
}
