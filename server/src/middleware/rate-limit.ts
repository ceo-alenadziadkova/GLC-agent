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
  RATE_LIMIT_REPORT_PDF_MAX_PER_WINDOW,
  RATE_LIMIT_REPORT_PDF_WINDOW_MS,
  RATE_LIMIT_BENCHMARK_RECOMPUTE_MAX_PER_WINDOW,
  RATE_LIMIT_BENCHMARK_RECOMPUTE_WINDOW_MS,
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
import { getRedisKeyPrefixWithColon, REDIS_KEYS } from '../config/redis-keys.js';
import {
  RATE_LIMIT_COMPARE_MESSAGE,
  RATE_LIMIT_DISCOVER_ANALYTICS_MESSAGE,
  RATE_LIMIT_BRIEF_PUBLIC_CREATE_MESSAGE,
  RATE_LIMIT_BRIEF_PUBLIC_READ_MESSAGE,
  RATE_LIMIT_BRIEF_PUBLIC_WRITE_MESSAGE,
  RATE_LIMIT_DISCOVER_CREATE_MESSAGE,
  RATE_LIMIT_DISCOVER_READ_MESSAGE,
  RATE_LIMIT_GENERAL_MESSAGE,
  RATE_LIMIT_REPORT_PDF_MESSAGE,
  RATE_LIMIT_INTAKE_LEGACY_MESSAGE,
  RATE_LIMIT_INTAKE_READ_MESSAGE,
  RATE_LIMIT_INTAKE_WRITE_MESSAGE,
  RATE_LIMIT_BENCHMARK_RECOMPUTE_MESSAGE,
  RATE_LIMIT_LOG_INGEST_MESSAGE,
  RATE_LIMIT_MARKETING_BRIEF_MESSAGE,
  RATE_LIMIT_PIPELINE_MESSAGE,
  RATE_LIMIT_SNAPSHOT_LOG_INGEST_MESSAGE,
  rateLimitAuditCreateMessage,
  rateLimitSnapshotPublicDailyCapMessage,
} from '../config/rate-limit-messages.js';
import { isTruthyQueryValue } from '../config/query-bool.js';
import { getRateLimitRedisUrl, isStrictRateLimitRedis } from '../config/redis-infra.js';
import { API_ERROR_CODES } from '../config/api-error-codes.js';

const PRL = SYSTEM_DEFAULTS.publicRouteRateLimits;

/** Public intake routes include `token` in `req.params` — key per link + IP (not all links sharing one client IP). */
function intakeTokenAndIpKey(req: Request): string {
  const token = typeof req.params.token === 'string' && req.params.token.length > 0 ? req.params.token : 'missing';
  return `${token}:${req.ip ?? 'unknown'}`;
}

const INTAKE_PUBLIC_WRITE_MAX_PER_HOUR =
  process.env.NODE_ENV === 'production'
    ? PRL.intakeWriteMaxPerHour
    : PRL.intakeWriteMaxPerHourNonProduction;

function retryAfterMinutesFromWindow(windowMs: number): number {
  return Math.max(1, Math.ceil(windowMs / MINUTE_MS));
}

/** Inferred from `createClient` so assignments stay compatible when redis adds optional modules / RESP versions. */
type RateLimitRedisClient = ReturnType<typeof createClient>;

const RATE_LIMIT_REDIS_URL = getRateLimitRedisUrl();
const STRICT_RATE_LIMIT_REDIS = isStrictRateLimitRedis();

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
let sharedRedisConnectPromise: Promise<RateLimitRedisClient> | null = null;

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
  sharedRedisConnectPromise = client.connect().catch((err: unknown) => {
    logger.warn('[rate-limit] redis connect failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  });
  sharedRedisClient = client;
  return client;
}

function rateLimitRedisKeyPrefix(): string {
  return getRedisKeyPrefixWithColon();
}

function distributedStore(prefix: string): RedisStore | undefined {
  const client = getSharedRedisClient();
  if (!client) return undefined;
  return new RedisStore({
    prefix: `${rateLimitRedisKeyPrefix()}${REDIS_KEYS.rateLimitNamespace}:${prefix}:`,
    sendCommand: async (...args: string[]) => {
      if (sharedRedisConnectPromise) {
        await sharedRedisConnectPromise;
      }
      return client.sendCommand(args);
    },
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
    code: API_ERROR_CODES.AUDIT_CREATE_RATE_LIMITED,
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
    code: API_ERROR_CODES.PIPELINE_RATE_LIMITED,
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
    code: API_ERROR_CODES.GENERAL_API_RATE_LIMITED,
    retry_after_seconds: Math.max(1, Math.ceil(RATE_LIMIT_GENERAL_WINDOW_MS / 1000)),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * PDF export limiter for CPU-heavy @react-pdf generation.
 * Applied only when `format=pdf`.
 */
export const reportPdfLimiter = rateLimit({
  windowMs: RATE_LIMIT_REPORT_PDF_WINDOW_MS,
  max: RATE_LIMIT_REPORT_PDF_MAX_PER_WINDOW,
  store: distributedStore('report_pdf'),
  keyGenerator: (req) => (req as AuthRequest).userId ?? req.ip ?? 'unknown',
  skip: req => String(req.query.format ?? 'json') !== 'pdf',
  message: {
    error: RATE_LIMIT_REPORT_PDF_MESSAGE,
    code: API_ERROR_CODES.REPORT_PDF_RATE_LIMITED,
    retry_after_seconds: Math.max(1, Math.ceil(RATE_LIMIT_REPORT_PDF_WINDOW_MS / 1000)),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Cron / secret-only benchmark recompute — keyed by IP. */
export const benchmarkRecomputeLimiter = rateLimit({
  windowMs: RATE_LIMIT_BENCHMARK_RECOMPUTE_WINDOW_MS,
  max: RATE_LIMIT_BENCHMARK_RECOMPUTE_MAX_PER_WINDOW,
  store: distributedStore('benchmark_recompute'),
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: RATE_LIMIT_BENCHMARK_RECOMPUTE_MESSAGE,
    code: API_ERROR_CODES.BENCHMARK_RECOMPUTE_RATE_LIMITED,
    retry_after_minutes: Math.max(1, Math.ceil(RATE_LIMIT_BENCHMARK_RECOMPUTE_WINDOW_MS / MINUTE_MS)),
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
    const want = isTruthyQueryValue(q.compare) || isTruthyQueryValue(q.include_competitor);
    return !want;
  },
  message: {
    error: RATE_LIMIT_COMPARE_MESSAGE,
    code: API_ERROR_CODES.COMPARE_RATE_LIMITED,
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
    code: API_ERROR_CODES.SNAPSHOT_PUBLIC_RATE_LIMITED,
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
    code: API_ERROR_CODES.INTAKE_LEGACY_RATE_LIMITED,
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
    code: API_ERROR_CODES.DISCOVER_CREATE_RATE_LIMITED,
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
    code: API_ERROR_CODES.DISCOVER_READ_RATE_LIMITED,
    retry_after_minutes: retryAfterMinutesFromWindow(HOUR_MS),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** GET /api/discover/ui-fragment — high-read static payload for public wizard bootstrapping. */
export const discoverUiFragmentReadLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: PRL.discoverUiFragmentReadMaxPerHour,
  store: distributedStore('discover_ui_fragment_read'),
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: RATE_LIMIT_DISCOVER_READ_MESSAGE,
    code: API_ERROR_CODES.DISCOVER_READ_RATE_LIMITED,
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
    code: API_ERROR_CODES.DISCOVER_ANALYTICS_RATE_LIMITED,
    retry_after_minutes: retryAfterMinutesFromWindow(HOUR_MS),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** POST /api/brief-public/session — starts public brief session. */
export const briefPublicCreateLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: PRL.briefPublicCreateMaxPerHour,
  store: distributedStore('brief_public_create'),
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: RATE_LIMIT_BRIEF_PUBLIC_CREATE_MESSAGE,
    code: API_ERROR_CODES.BRIEF_PUBLIC_CREATE_RATE_LIMITED,
    retry_after_minutes: retryAfterMinutesFromWindow(HOUR_MS),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** GET /api/brief-public/session/:token — load session state. */
export const briefPublicReadLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: PRL.briefPublicReadMaxPerHour,
  store: distributedStore('brief_public_read'),
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: RATE_LIMIT_BRIEF_PUBLIC_READ_MESSAGE,
    code: API_ERROR_CODES.BRIEF_PUBLIC_READ_RATE_LIMITED,
    retry_after_minutes: retryAfterMinutesFromWindow(HOUR_MS),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** PATCH/POST /api/brief-public/session/:token — save or submit session. */
export const briefPublicWriteLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: PRL.briefPublicWriteMaxPerHour,
  store: distributedStore('brief_public_write'),
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: RATE_LIMIT_BRIEF_PUBLIC_WRITE_MESSAGE,
    code: API_ERROR_CODES.BRIEF_PUBLIC_WRITE_RATE_LIMITED,
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
  keyGenerator: (req) => intakeTokenAndIpKey(req),
  message: {
    error: RATE_LIMIT_INTAKE_READ_MESSAGE,
    code: API_ERROR_CODES.INTAKE_READ_RATE_LIMITED,
    retry_after_minutes: retryAfterMinutesFromWindow(HOUR_MS),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** POST /api/intake/:token/respond — public saves. */
export const intakePublicWriteLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: INTAKE_PUBLIC_WRITE_MAX_PER_HOUR,
  store: distributedStore('intake_public_write'),
  keyGenerator: (req) => intakeTokenAndIpKey(req),
  message: {
    error: RATE_LIMIT_INTAKE_WRITE_MESSAGE,
    code: API_ERROR_CODES.INTAKE_WRITE_RATE_LIMITED,
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
    code: API_ERROR_CODES.MARKETING_BRIEF_RATE_LIMITED,
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
    code: API_ERROR_CODES.LOG_INGEST_RATE_LIMITED,
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
    code: API_ERROR_CODES.SNAPSHOT_LOG_RATE_LIMITED,
  },
  standardHeaders: true,
  legacyHeaders: false,
});
