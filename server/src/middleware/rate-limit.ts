import rateLimit, { MemoryStore } from 'express-rate-limit';
import type { Request } from 'express';
import type { AuthRequest } from './auth.js';

/**
 * Rate limiter for audit creation: max 5 audits per user per day.
 */
export const createAuditLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5,
  keyGenerator: (req) => (req as AuthRequest).userId ?? req.ip ?? 'unknown',
  message: {
    error: 'Too many audits created. Maximum 5 per day.',
    retry_after_hours: 24,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for pipeline operations: max 30 phase runs per hour.
 */
export const pipelineLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  keyGenerator: (req) => (req as AuthRequest).userId ?? req.ip ?? 'unknown',
  message: {
    error: 'Too many pipeline operations. Please wait before retrying.',
    retry_after_minutes: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter: 100 requests per minute.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  keyGenerator: (req) => (req as AuthRequest).userId ?? req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
});

/** Free website check starts (POST) per IP per rolling 24h window — abuse control. */
export const SNAPSHOT_PUBLIC_MAX_PER_DAY = 3;
export const SNAPSHOT_PUBLIC_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Single store for POST limiter and read-only quota peek (`GET /api/snapshot/quota`). */
export const snapshotPublicQuotaStore = new MemoryStore();

/** Stricter cap for opt-in competitor compare on `GET /api/snapshot/:token?compare=1` (per IP, rolling 1h). */
export const SNAPSHOT_COMPARE_MAX_PER_HOUR = Number(process.env.SNAPSHOT_COMPARE_MAX_PER_HOUR ?? 15);

export const snapshotCompareLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number.isFinite(SNAPSHOT_COMPARE_MAX_PER_HOUR) && SNAPSHOT_COMPARE_MAX_PER_HOUR > 0 ? SNAPSHOT_COMPARE_MAX_PER_HOUR : 15,
  keyGenerator: (req) => `${req.ip ?? 'unknown'}:snapshot_compare`,
  skip: (req) => {
    const q = req.query as Record<string, string | undefined>;
    const want =
      q.compare === '1' || q.compare === 'true' || q.include_competitor === '1';
    return !want;
  },
  message: {
    error: 'Too many competitor comparisons. Try again later.',
    code: 'COMPARE_RATE_LIMITED',
    retry_after_minutes: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export function snapshotPublicQuotaKey(req: Request): string {
  return req.ip ?? 'unknown';
}

/**
 * Current free-check allowance for this IP (does not consume quota). Uses the same sliding window as POST /api/snapshot.
 */
export async function getSnapshotPublicQuota(req: Request): Promise<{
  limit: number;
  remaining: number;
  period: 'day';
  reset_at: string | null;
}> {
  const key = snapshotPublicQuotaKey(req);
  const entry = await snapshotPublicQuotaStore.get(key);
  const now = Date.now();
  let used = 0;
  let resetAt: string | null = null;
  const rt = entry?.resetTime;
  if (entry && rt && rt.getTime() > now) {
    used = entry.totalHits;
    resetAt = rt.toISOString();
  }
  const remaining = Math.max(0, SNAPSHOT_PUBLIC_MAX_PER_DAY - used);
  return {
    limit: SNAPSHOT_PUBLIC_MAX_PER_DAY,
    remaining,
    period: 'day',
    reset_at: resetAt,
  };
}

/**
 * Public free snapshot: limit POST /api/snapshot by IP (no auth).
 * Apply only to the start endpoint so GET polling does not consume quota.
 */
export const snapshotPublicLimiter = rateLimit({
  windowMs: SNAPSHOT_PUBLIC_WINDOW_MS,
  max: SNAPSHOT_PUBLIC_MAX_PER_DAY,
  store: snapshotPublicQuotaStore,
  keyGenerator: (req) => snapshotPublicQuotaKey(req),
  /** Only successful starts (2xx) consume a daily slot — validation errors and domain cooldown 429 do not. */
  skipFailedRequests: true,
  message: {
    error: `You've used all ${SNAPSHOT_PUBLIC_MAX_PER_DAY} free website checks available today from this connection. Please try again tomorrow — or sign in for a full audit.`,
    code: 'RATE_LIMITED',
    limit: SNAPSHOT_PUBLIC_MAX_PER_DAY,
    remaining: 0,
    period: 'day',
    retry_after_hours: 24,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Public intake token endpoints: 30 requests per hour by IP.
 * Generous enough for legitimate re-submissions and refreshes.
 */
export const intakePublicLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: 'Too many requests to this intake link. Try again later.',
    retry_after_minutes: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Authenticated client log ingest. Per-minute window so bursty UI logging does not
 * lock out for an hour (the old 120/hour limit was easy to hit with HMR + realtime).
 */
export const logIngestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 180,
  keyGenerator: (req) => (req as AuthRequest).userId ?? req.ip ?? 'unknown',
  message: {
    error: 'Too many log events. Please wait before retrying.',
    retry_after_seconds: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});
