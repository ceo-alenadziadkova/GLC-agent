/**
 * SSRF mitigation: only allow http(s) URLs that resolve to public addresses.
 * Blocks loopback, RFC1918, link-local, CGNAT, credentials in URL, and obvious internal hostnames.
 */
import dns from 'node:dns/promises';
import { isIPv4, isIPv6, type LookupFunction } from 'node:net';
import { Agent, fetch as undiciFetch } from 'undici';
import { isNoPublicWebsiteUrl, NO_PUBLIC_WEBSITE_URL } from '../config/no-public-website.js';
import {
  PUBLIC_HTTP_FETCH,
  PUBLIC_HTTP_FETCH_METHODS_WITHOUT_RETRY,
  PUBLIC_HTTP_FETCH_RETRYABLE_STATUS,
} from '../config/public-http-fetch.js';
import type { ApiErrorCode } from '../config/api-error-codes.js';
import { API_ERROR_CODES } from '../config/api-error-codes.js';
import { resolvePublicUrlErrorMessage } from '../config/public-url-error-message.js';
import {
  BLOCKED_IPV4_PREFIXES,
  BLOCKED_IPV4_RANGES,
  BLOCKED_IPV6_EXACT,
  BLOCKED_IPV6_PREFIXES,
  BLOCKED_PUBLIC_URL_HOST_SUFFIXES,
  BLOCKED_PUBLIC_URL_HOSTS,
  PUBLIC_URL_REDIRECT_STATUS_CODES,
} from '../config/public-url-policy.js';

export class PublicUrlNotAllowedError extends Error {
  override name = 'PublicUrlNotAllowedError';
  readonly code: ApiErrorCode;
  constructor(code: ApiErrorCode) {
    super(resolvePublicUrlErrorMessage(code));
    this.code = code;
  }
}

function isPrivateOrBlockedIPv4(address: string): boolean {
  const parts = address.split('.').map(p => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (BLOCKED_IPV4_PREFIXES.has(a as 0 | 10 | 127)) return true;
  if (
    BLOCKED_IPV4_RANGES.some(
      (range) => range.octetA === a && b >= range.octetBMin && b <= range.octetBMax,
    )
  ) {
    return true;
  }
  return false;
}

function isPrivateOrBlockedIPv6(address: string): boolean {
  const n = address.toLowerCase();
  if (BLOCKED_IPV6_EXACT.has(n as '::1')) return true;
  if (BLOCKED_IPV6_PREFIXES.some(prefix => n.startsWith(prefix))) return true;
  if (n.startsWith('::ffff:')) {
    const v4 = n.slice(7);
    return isIPv4(v4) && isPrivateOrBlockedIPv4(v4);
  }
  return false;
}

function assertHostnameNotBlocked(hostname: string): void {
  const h = hostname.toLowerCase();
  if (
    BLOCKED_PUBLIC_URL_HOSTS.has(h as 'localhost') ||
    BLOCKED_PUBLIC_URL_HOST_SUFFIXES.some(suffix => h.endsWith(suffix))
  ) {
    throw new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_HOST_NOT_ALLOWED);
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
    throw new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_INVALID);
  }

  if (u.username || u.password) {
    throw new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_CREDENTIALS_NOT_ALLOWED);
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_PROTOCOL_NOT_ALLOWED);
  }

  const host = u.hostname;
  assertHostnameNotBlocked(host);

  const ipProbe = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;

  if (isIPv4(ipProbe)) {
    if (isPrivateOrBlockedIPv4(ipProbe)) {
      throw new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_ADDRESS_NOT_PUBLIC);
    }
    return u.href;
  }
  if (isIPv6(ipProbe)) {
    if (isPrivateOrBlockedIPv6(ipProbe)) {
      throw new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_ADDRESS_NOT_PUBLIC);
    }
    return u.href;
  }

  let records: Array<{ address: string; family: number }>;
  try {
    records = await dns.lookup(host, { all: true });
  } catch {
    throw new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_DNS_DOES_NOT_RESOLVE);
  }
  if (records.length === 0) {
    throw new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_DNS_DOES_NOT_RESOLVE);
  }

  for (const r of records) {
    if (r.family === 4) {
      if (isPrivateOrBlockedIPv4(r.address)) {
        throw new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_DNS_NON_PUBLIC);
      }
    } else if (isPrivateOrBlockedIPv6(r.address)) {
      throw new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_DNS_NON_PUBLIC);
    }
  }

  return u.href;
}

function isRedirectStatus(status: number): boolean {
  return PUBLIC_URL_REDIRECT_STATUS_CODES.has(status as 301 | 302 | 303 | 307 | 308);
}

async function resolvePublicIpForHost(host: string): Promise<{ address: string; family: 4 | 6 }> {
  if (isIPv4(host)) {
    if (isPrivateOrBlockedIPv4(host)) {
      throw new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_ADDRESS_NOT_PUBLIC);
    }
    return { address: host, family: 4 };
  }
  if (isIPv6(host)) {
    const raw = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
    if (isPrivateOrBlockedIPv6(raw)) {
      throw new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_ADDRESS_NOT_PUBLIC);
    }
    return { address: raw, family: 6 };
  }
  const records = await dns.lookup(host, { all: true });
  if (records.length === 0) {
    throw new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_DNS_DOES_NOT_RESOLVE);
  }
  const selected = records.find((r) => {
    if (r.family === 4) return !isPrivateOrBlockedIPv4(r.address);
    return !isPrivateOrBlockedIPv6(r.address);
  });
  if (!selected || (selected.family !== 4 && selected.family !== 6)) {
    throw new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_DNS_NON_PUBLIC);
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
      cb(
        new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_DNS_REBINDING) as NodeJS.ErrnoException,
        '',
        family,
      );
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
  maxRedirects: number = PUBLIC_HTTP_FETCH.defaultMaxRedirects,
): Promise<Response> {
  if (isNoPublicWebsiteUrl(url.trim())) {
    throw new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_NO_PUBLIC_WEBSITE);
  }

  let currentUrl = await validatePublicAuditUrl(url);
  const maxRetries = PUBLIC_HTTP_FETCH.maxRetries;
  const retryableStatus = PUBLIC_HTTP_FETCH_RETRYABLE_STATUS;
  const methodsWithoutRetry = PUBLIC_HTTP_FETCH_METHODS_WITHOUT_RETRY;
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
      const backoffMs =
        PUBLIC_HTTP_FETCH.backoffBaseMs * Math.pow(2, attempt - 1) +
        Math.floor(Math.random() * PUBLIC_HTTP_FETCH.backoffJitterMaxMs);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
    if (!response) {
      throw lastErr ?? new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_REQUEST_FAILED);
    }

    if (isRedirectStatus(response.status)) {
      if (hop === maxRedirects) {
        throw new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_TOO_MANY_REDIRECTS);
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

  throw new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_TOO_MANY_REDIRECTS);
}
