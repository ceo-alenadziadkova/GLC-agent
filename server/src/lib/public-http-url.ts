/**
 * SSRF mitigation: only allow http(s) URLs that resolve to public addresses.
 * Blocks loopback, RFC1918, link-local, CGNAT, credentials in URL, and obvious internal hostnames.
 */
import dns from 'node:dns/promises';
import { isIPv4, isIPv6 } from 'node:net';

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
  let u: URL;
  try {
    u = new URL(urlString.trim());
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
        response = await fetch(currentUrl, { ...init, redirect: 'manual' });
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
