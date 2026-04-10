import rateLimit, { MemoryStore } from 'express-rate-limit';
import type { Request } from 'express';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import type { AuthRequest } from './auth.js';
import { logger } from '../services/logger.js';

/** Inferred from `createClient` so assignments stay compatible when redis adds optional modules / RESP versions. */
type RateLimitRedisClient = ReturnType<typeof createClient>;

const RATE_LIMIT_REDIS_URL = process.env.RATE_LIMIT_REDIS_URL?.trim() ?? '';

if (process.env.NODE_ENV === 'production' && !RATE_LIMIT_REDIS_URL) {
  logger.warn(
    '[rate-limit] RATE_LIMIT_REDIS_URL unset: public Discover / intake / marketing-brief limiters use in-process MemoryStore — ' +
      'counters do not aggregate across multiple API instances. Set Redis for shared rate limits when horizontally scaled.',
  );
}

let sharedRedisClient: RateLimitRedisClient | null = null;

function getSharedRedisClient(): RateLimitRedisClient | null {
  if (!RATE_LIMIT_REDIS_URL) return null;
  if (sharedRedisClient) return sharedRedisClient;
  const client = createClient({ url: RATE_LIMIT_REDIS_URL });
  client.on('error', (err) => {
    // Non-fatal: limiter calls will fail if redis is unreachable.
    logger.warn('[rate-limit] redis client error', {
      error: err instanceof Error ? err.message : String(err),
    });
  });
  void client.connect();
  sharedRedisClient = client;
  return client;
}

function distributedStore(prefix: string): RedisStore | undefined {
  const client = getSharedRedisClient();
  if (!client) return undefined;
  return new RedisStore({
    prefix: `glc:${prefix}:`,
    sendCommand: (...args: string[]) => client.sendCommand(args),
  });
}

/**
 * Rate limiter for audit creation: max 5 audits per user per day.
 */
export const createAuditLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5,
  store: distributedStore('audit_create'),
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
  store: distributedStore('pipeline_ops'),
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
  store: distributedStore('general_api'),
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
  store: distributedStore('snapshot_compare'),
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

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const HOUR_MS = 60 * 60 * 1000;

/** @deprecated Prefer split limiters (discover/intake read vs write). Kept for tests and gradual rollout. */
export const intakePublicLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: parsePositiveInt(process.env.PUBLIC_INTAKE_LEGACY_MAX_PER_HOUR, 30),
  store: distributedStore('intake_public_legacy'),
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: 'Too many requests to this intake link. Try again later.',
    retry_after_minutes: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** POST /api/discover — session creation (spam surface). */
export const discoverSessionCreateLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: parsePositiveInt(process.env.PUBLIC_DISCOVER_CREATE_MAX_PER_HOUR, 12),
  store: distributedStore('discover_create'),
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: 'Too many discovery submissions from this connection. Try again later.',
    code: 'DISCOVER_CREATE_RATE_LIMITED',
    retry_after_minutes: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** GET discovery session / ui-fragment / PATCH contact — reads and light writes. */
export const discoverPublicReadLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: parsePositiveInt(process.env.PUBLIC_DISCOVER_READ_MAX_PER_HOUR, 80),
  store: distributedStore('discover_read'),
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: 'Too many discovery requests from this connection. Try again later.',
    code: 'DISCOVER_READ_RATE_LIMITED',
    retry_after_minutes: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** POST /api/discover/analytics-events — batched telemetry. */
export const discoverAnalyticsPublicLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: parsePositiveInt(process.env.PUBLIC_DISCOVER_ANALYTICS_MAX_PER_HOUR, 200),
  store: distributedStore('discover_analytics'),
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: 'Too many analytics batches from this connection. Try again later.',
    code: 'DISCOVER_ANALYTICS_RATE_LIMITED',
    retry_after_minutes: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** GET /api/intake/:token — public load. */
export const intakePublicReadLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: parsePositiveInt(process.env.PUBLIC_INTAKE_READ_MAX_PER_HOUR, 60),
  store: distributedStore('intake_public_read'),
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: 'Too many requests to this intake link. Try again later.',
    code: 'INTAKE_READ_RATE_LIMITED',
    retry_after_minutes: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** POST /api/intake/:token/respond — public saves. */
export const intakePublicWriteLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: parsePositiveInt(process.env.PUBLIC_INTAKE_WRITE_MAX_PER_HOUR, 30),
  store: distributedStore('intake_public_write'),
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: 'Too many save attempts to this intake link. Try again later.',
    code: 'INTAKE_WRITE_RATE_LIMITED',
    retry_after_minutes: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** POST /api/marketing/brief — public lead form. */
export const marketingBriefPublicLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: parsePositiveInt(process.env.PUBLIC_MARKETING_BRIEF_MAX_PER_HOUR, 24),
  store: distributedStore('marketing_brief_public'),
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: 'Too many submissions from this connection. Try again later.',
    code: 'MARKETING_BRIEF_RATE_LIMITED',
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
  store: distributedStore('log_ingest'),
  keyGenerator: (req) => (req as AuthRequest).userId ?? req.ip ?? 'unknown',
  message: {
    error: 'Too many log events. Please wait before retrying.',
    retry_after_seconds: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const snapshotLogMaxPerMin = Number(process.env.SNAPSHOT_LOG_INGEST_MAX_PER_MIN ?? 40);

/** Anonymous / guest snapshot page log ingest — stricter cap than full accounts. */
export const snapshotLogIngestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number.isFinite(snapshotLogMaxPerMin) && snapshotLogMaxPerMin > 0 ? snapshotLogMaxPerMin : 40,
  store: distributedStore('snapshot_log_ingest'),
  keyGenerator: (req) => (req as AuthRequest).userId ?? req.ip ?? 'unknown',
  message: {
    error: 'Too many log events from this preview session. Please wait before retrying.',
    retry_after_seconds: 60,
    code: 'SNAPSHOT_LOG_RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
