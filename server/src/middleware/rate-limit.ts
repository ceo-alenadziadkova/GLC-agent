import rateLimit, { MemoryStore } from 'express-rate-limit';
import type { Request } from 'express';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import type { AuthRequest } from './auth.js';
import { logger } from '../services/logger.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import {
  HOUR_MS,
  MINUTE_MS,
  RATE_LIMIT_AUDIT_CREATE_MAX_PER_DAY,
  RATE_LIMIT_AUDIT_CREATE_WINDOW_MS,
  RATE_LIMIT_GENERAL_MAX_PER_WINDOW,
  RATE_LIMIT_GENERAL_WINDOW_MS,
  RATE_LIMIT_LOG_INGEST_MAX_PER_WINDOW,
  RATE_LIMIT_LOG_INGEST_WINDOW_MS,
  RATE_LIMIT_PIPELINE_MAX_PER_WINDOW,
  RATE_LIMIT_PIPELINE_WINDOW_MS,
  SNAPSHOT_COMPARE_MAX_PER_HOUR,
  SNAPSHOT_COMPARE_WINDOW_MS,
  SNAPSHOT_LOG_INGEST_MAX_PER_MIN,
  SNAPSHOT_PUBLIC_MAX_PER_DAY,
  SNAPSHOT_PUBLIC_WINDOW_MS,
} from '../config/rate-limits.js';
import { REDIS_KEYS } from '../config/redis-keys.js';
import {
  RATE_LIMIT_COMPARE_MESSAGE,
  RATE_LIMIT_DISCOVER_ANALYTICS_MESSAGE,
  RATE_LIMIT_DISCOVER_CREATE_MESSAGE,
  RATE_LIMIT_DISCOVER_READ_MESSAGE,
  RATE_LIMIT_GENERAL_MESSAGE,
  RATE_LIMIT_INTAKE_LEGACY_MESSAGE,
  RATE_LIMIT_INTAKE_READ_MESSAGE,
  RATE_LIMIT_INTAKE_WRITE_MESSAGE,
  RATE_LIMIT_LOG_INGEST_MESSAGE,
  RATE_LIMIT_MARKETING_BRIEF_MESSAGE,
  RATE_LIMIT_PIPELINE_MESSAGE,
  RATE_LIMIT_SNAPSHOT_LOG_INGEST_MESSAGE,
  rateLimitAuditCreateMessage,
  rateLimitSnapshotPublicDailyCapMessage,
} from '../config/rate-limit-messages.js';

const PRL = SYSTEM_DEFAULTS.publicRouteRateLimits;

function retryAfterMinutesFromWindow(windowMs: number): number {
  return Math.max(1, Math.ceil(windowMs / MINUTE_MS));
}

/** Inferred from `createClient` so assignments stay compatible when redis adds optional modules / RESP versions. */
type RateLimitRedisClient = ReturnType<typeof createClient>;

const RATE_LIMIT_REDIS_URL = process.env.RATE_LIMIT_REDIS_URL?.trim() ?? '';
const STRICT_RATE_LIMIT_REDIS = String(process.env.STRICT_RATE_LIMIT_REDIS ?? '').toLowerCase() === 'true';

if (process.env.NODE_ENV === 'production' && !RATE_LIMIT_REDIS_URL && STRICT_RATE_LIMIT_REDIS) {
  throw new Error(
    '[rate-limit] STRICT_RATE_LIMIT_REDIS=true but RATE_LIMIT_REDIS_URL is unset. Refusing to start with non-distributed public rate limits.',
  );
}

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

function rateLimitRedisKeyPrefix(): string {
  const p = process.env.REDIS_KEY_PREFIX?.trim().replace(/:+$/, '');
  return p ? `${p}:` : '';
}

function distributedStore(prefix: string): RedisStore | undefined {
  const client = getSharedRedisClient();
  if (!client) return undefined;
  return new RedisStore({
    prefix: `${rateLimitRedisKeyPrefix()}${REDIS_KEYS.rateLimitNamespace}:${prefix}:`,
    sendCommand: (...args: string[]) => client.sendCommand(args),
  });
}

const limiterStoreMode = RATE_LIMIT_REDIS_URL ? 'redis' : 'memory';
logger.info('[rate-limit] store mode initialized', {
  shared_store: limiterStoreMode,
  strict_redis: STRICT_RATE_LIMIT_REDIS,
  snapshot_public_quota_store: RATE_LIMIT_REDIS_URL ? 'redis' : 'memory',
});

/**
 * Rate limiter for audit creation (defaults: max 5 per user per rolling 24h; env-tunable).
 */
export const createAuditLimiter = rateLimit({
  windowMs: RATE_LIMIT_AUDIT_CREATE_WINDOW_MS,
  max: RATE_LIMIT_AUDIT_CREATE_MAX_PER_DAY,
  store: distributedStore('audit_create'),
  keyGenerator: (req) => (req as AuthRequest).userId ?? req.ip ?? 'unknown',
  message: {
    error: rateLimitAuditCreateMessage(RATE_LIMIT_AUDIT_CREATE_MAX_PER_DAY),
    code: 'AUDIT_CREATE_RATE_LIMITED',
    retry_after_hours: Math.max(1, Math.ceil(RATE_LIMIT_AUDIT_CREATE_WINDOW_MS / HOUR_MS)),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for pipeline operations (defaults: 30 per rolling hour; env-tunable).
 */
export const pipelineLimiter = rateLimit({
  windowMs: RATE_LIMIT_PIPELINE_WINDOW_MS,
  max: RATE_LIMIT_PIPELINE_MAX_PER_WINDOW,
  store: distributedStore('pipeline_ops'),
  keyGenerator: (req) => (req as AuthRequest).userId ?? req.ip ?? 'unknown',
  message: {
    error: RATE_LIMIT_PIPELINE_MESSAGE,
    code: 'PIPELINE_RATE_LIMITED',
    retry_after_minutes: Math.max(1, Math.ceil(RATE_LIMIT_PIPELINE_WINDOW_MS / MINUTE_MS)),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter (defaults: 100 req/min per identity; env-tunable).
 */
export const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_GENERAL_WINDOW_MS,
  max: RATE_LIMIT_GENERAL_MAX_PER_WINDOW,
  store: distributedStore('general_api'),
  keyGenerator: (req) => (req as AuthRequest).userId ?? req.ip ?? 'unknown',
  message: {
    error: RATE_LIMIT_GENERAL_MESSAGE,
    code: 'GENERAL_API_RATE_LIMITED',
    retry_after_seconds: Math.max(1, Math.ceil(RATE_LIMIT_GENERAL_WINDOW_MS / 1000)),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Single store for POST limiter and read-only quota peek (`GET /api/snapshot/quota`). */
export const snapshotPublicQuotaStore = distributedStore('snapshot_public_quota') ?? new MemoryStore();

export {
  SNAPSHOT_COMPARE_MAX_PER_HOUR,
  SNAPSHOT_COMPARE_WINDOW_MS,
  SNAPSHOT_PUBLIC_MAX_PER_DAY,
  SNAPSHOT_PUBLIC_WINDOW_MS,
} from '../config/rate-limits.js';

export const snapshotCompareLimiter = rateLimit({
  windowMs: SNAPSHOT_COMPARE_WINDOW_MS,
  max: SNAPSHOT_COMPARE_MAX_PER_HOUR,
  store: distributedStore('snapshot_compare'),
  keyGenerator: (req) => `${req.ip ?? 'unknown'}:snapshot_compare`,
  skip: (req) => {
    const q = req.query as Record<string, string | undefined>;
    const want =
      q.compare === '1' || q.compare === 'true' || q.include_competitor === '1';
    return !want;
  },
  message: {
    error: RATE_LIMIT_COMPARE_MESSAGE,
    code: 'COMPARE_RATE_LIMITED',
    retry_after_minutes: Math.max(1, Math.ceil(SNAPSHOT_COMPARE_WINDOW_MS / MINUTE_MS)),
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
  const dynamicStore = snapshotPublicQuotaStore as {
    get?: (k: string) => Promise<{ totalHits: number; resetTime?: Date } | undefined>;
  };
  const entry = dynamicStore.get ? await dynamicStore.get(key) : undefined;
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
    error: rateLimitSnapshotPublicDailyCapMessage(SNAPSHOT_PUBLIC_MAX_PER_DAY),
    code: 'RATE_LIMITED',
    limit: SNAPSHOT_PUBLIC_MAX_PER_DAY,
    remaining: 0,
    period: 'day',
    retry_after_hours: Math.max(1, Math.ceil(SNAPSHOT_PUBLIC_WINDOW_MS / HOUR_MS)),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** @deprecated Prefer split limiters (discover/intake read vs write). Kept for tests and gradual rollout. */
export const intakePublicLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: PRL.intakeLegacyMaxPerHour,
  store: distributedStore('intake_public_legacy'),
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: RATE_LIMIT_INTAKE_LEGACY_MESSAGE,
    code: 'INTAKE_LEGACY_RATE_LIMITED',
    retry_after_minutes: retryAfterMinutesFromWindow(HOUR_MS),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** POST /api/discover — session creation (spam surface). */
export const discoverSessionCreateLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: PRL.discoverCreateMaxPerHour,
  store: distributedStore('discover_create'),
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: RATE_LIMIT_DISCOVER_CREATE_MESSAGE,
    code: 'DISCOVER_CREATE_RATE_LIMITED',
    retry_after_minutes: retryAfterMinutesFromWindow(HOUR_MS),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** GET discovery session / ui-fragment / PATCH contact — reads and light writes. */
export const discoverPublicReadLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: PRL.discoverReadMaxPerHour,
  store: distributedStore('discover_read'),
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: RATE_LIMIT_DISCOVER_READ_MESSAGE,
    code: 'DISCOVER_READ_RATE_LIMITED',
    retry_after_minutes: retryAfterMinutesFromWindow(HOUR_MS),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** POST /api/discover/analytics-events — batched telemetry. */
export const discoverAnalyticsPublicLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: PRL.discoverAnalyticsMaxPerHour,
  store: distributedStore('discover_analytics'),
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: RATE_LIMIT_DISCOVER_ANALYTICS_MESSAGE,
    code: 'DISCOVER_ANALYTICS_RATE_LIMITED',
    retry_after_minutes: retryAfterMinutesFromWindow(HOUR_MS),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** GET /api/intake/:token — public load. */
export const intakePublicReadLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: PRL.intakeReadMaxPerHour,
  store: distributedStore('intake_public_read'),
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: RATE_LIMIT_INTAKE_READ_MESSAGE,
    code: 'INTAKE_READ_RATE_LIMITED',
    retry_after_minutes: retryAfterMinutesFromWindow(HOUR_MS),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** POST /api/intake/:token/respond — public saves. */
export const intakePublicWriteLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: PRL.intakeWriteMaxPerHour,
  store: distributedStore('intake_public_write'),
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: RATE_LIMIT_INTAKE_WRITE_MESSAGE,
    code: 'INTAKE_WRITE_RATE_LIMITED',
    retry_after_minutes: retryAfterMinutesFromWindow(HOUR_MS),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** POST /api/marketing/brief — public lead form. */
export const marketingBriefPublicLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: PRL.marketingBriefMaxPerHour,
  store: distributedStore('marketing_brief_public'),
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: RATE_LIMIT_MARKETING_BRIEF_MESSAGE,
    code: 'MARKETING_BRIEF_RATE_LIMITED',
    retry_after_minutes: retryAfterMinutesFromWindow(HOUR_MS),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Authenticated client log ingest. Per-minute window so bursty UI logging does not
 * lock out for an hour (the old 120/hour limit was easy to hit with HMR + realtime).
 */
export const logIngestLimiter = rateLimit({
  windowMs: RATE_LIMIT_LOG_INGEST_WINDOW_MS,
  max: RATE_LIMIT_LOG_INGEST_MAX_PER_WINDOW,
  store: distributedStore('log_ingest'),
  keyGenerator: (req) => (req as AuthRequest).userId ?? req.ip ?? 'unknown',
  message: {
    error: RATE_LIMIT_LOG_INGEST_MESSAGE,
    code: 'LOG_INGEST_RATE_LIMITED',
    retry_after_seconds: Math.max(1, Math.ceil(RATE_LIMIT_LOG_INGEST_WINDOW_MS / 1000)),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Anonymous / guest snapshot page log ingest — stricter cap than full accounts. */
export const snapshotLogIngestLimiter = rateLimit({
  windowMs: MINUTE_MS,
  max: SNAPSHOT_LOG_INGEST_MAX_PER_MIN,
  store: distributedStore('snapshot_log_ingest'),
  keyGenerator: (req) => (req as AuthRequest).userId ?? req.ip ?? 'unknown',
  message: {
    error: RATE_LIMIT_SNAPSHOT_LOG_INGEST_MESSAGE,
    retry_after_seconds: Math.max(1, Math.ceil(MINUTE_MS / 1000)),
    code: 'SNAPSHOT_LOG_RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
