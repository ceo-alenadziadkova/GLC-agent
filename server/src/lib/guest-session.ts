/**
 * App-level guest session for public snapshot (httpOnly cookie + DB row).
 * No Supabase anonymous JWT required.
 */
import { createHash, randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { REQUEST_FIELD_LIMITS } from '../config/request-field-limits.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';

const SG = SYSTEM_DEFAULTS.snapshotGuestSession;

/** HttpOnly cookie name for public snapshot guest sessions. */
export const SNAPSHOT_GUEST_COOKIE_NAME = SG.cookieName;

/** Browser cookie lifetime (seconds). */
export const GUEST_SESSION_MAX_AGE_SEC = SG.maxAgeSec;

const DEV_FALLBACK_IP_SALT = 'dev-only-snapshot-guest-ip-salt';

function getIpSalt(): string {
  const fromEnv = (process.env.SNAPSHOT_GUEST_IP_SALT ?? '').trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SNAPSHOT_GUEST_IP_SALT is required when NODE_ENV=production');
  }
  return DEV_FALLBACK_IP_SALT;
}

/**
 * Ensures production deployments do not run with a predictable default IP hash salt.
 * Call once before listening.
 */
export function assertSnapshotGuestSaltIfProduction(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const salt = (process.env.SNAPSHOT_GUEST_IP_SALT ?? '').trim();
  if (!salt) {
    throw new Error('SNAPSHOT_GUEST_IP_SALT must be set to a non-empty secret when NODE_ENV=production');
  }
}

/**
 * One-way hash of client IP for funnel analytics (no raw IP stored).
 */
export function hashSnapshotGuestIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  const raw =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : Array.isArray(forwarded)
        ? forwarded[0]?.trim()
        : '';
  const ip = raw || req.socket?.remoteAddress || '';
  if (!ip) return null;
  return createHash('sha256').update(`${ip}:${getIpSalt()}`, 'utf8').digest('hex');
}

function parseGuestCookie(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header || typeof header !== 'string') return null;
  const parts = header.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (k === SNAPSHOT_GUEST_COOKIE_NAME && rest.length > 0) {
      const v = rest.join('=').trim();
      if (/^[0-9a-f]{64}$/i.test(v)) return v;
    }
  }
  return null;
}

function isHttpsRequest(req: Request): boolean {
  const xf = req.headers['x-forwarded-proto'];
  if (xf === 'https') return true;
  return req.protocol === 'https';
}

/**
 * Cross-origin SPA (e.g. Vercel) calling API on another host needs SameSite=None + Secure
 * so the browser sends the cookie on credentialed fetch. Same-site deployments can still use this.
 */
function cookieFlags(req: Request): { sameSite: 'None' | 'Lax'; secure: boolean } {
  if (process.env.NODE_ENV !== 'production') {
    return { sameSite: 'Lax', secure: false };
  }
  return { sameSite: 'None', secure: isHttpsRequest(req) };
}

/**
 * Reads existing guest token from cookie or issues a new one and sets httpOnly cookie.
 */
export function getOrIssueSnapshotGuestToken(req: Request, res: Response): string {
  const existing = parseGuestCookie(req);
  if (existing) return existing;

  const token = randomBytes(SG.tokenBytes).toString('hex');
  const { sameSite, secure } = cookieFlags(req);
  const parts = [
    `${SNAPSHOT_GUEST_COOKIE_NAME}=${token}`,
    'Path=/',
    `Max-Age=${GUEST_SESSION_MAX_AGE_SEC}`,
    'HttpOnly',
    `SameSite=${sameSite}`,
  ];
  if (secure) parts.push('Secure');
  res.appendHeader('Set-Cookie', parts.join('; '));
  return token;
}

export function extractUtmFromBody(body: unknown): {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
} {
  const b = body as Record<string, unknown> | null;
  if (!b || typeof b !== 'object') {
    return { utm_source: null, utm_medium: null, utm_campaign: null };
  }
  const s = (k: string): string | null => {
    const v = b[k];
    return typeof v === 'string' && v.trim().length > 0
      ? v.trim().slice(0, REQUEST_FIELD_LIMITS.storedUserAgentMax)
      : null;
  };
  return {
    utm_source: s('utm_source'),
    utm_medium: s('utm_medium'),
    utm_campaign: s('utm_campaign'),
  };
}
