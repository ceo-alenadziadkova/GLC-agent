import { supabase } from './supabase.js';
import { logger } from './logger.js';
import { cleanupExpiredIdempotencyKeys } from '../lib/idempotency.js';
import { getSharedRedisClient } from './redis.js';
import { emitStructuredNotification } from './notifications.js';
import {
  ALERT_CHECK_INTERVAL_MS,
  ALERT_CHECK_WINDOW_MINUTES,
  ALERT_COOLDOWN_MS,
  ALERT_FAILURE_RATE_THRESHOLD,
  ALERT_LATENCY_P95_MS_THRESHOLD,
  ALERT_LOCK_TTL_MS,
  ALERT_TOKEN_BURN_THRESHOLD,
} from '../config/alerts-config.js';
import { ALERT_LATENCY_PERCENTILE } from '../config/alert-thresholds.js';
import {
  formatPipelineFailureRateMessageEn,
  formatPipelineLatencyP95MessageEn,
  formatPipelineTokenBurnMessageEn,
  pipelineAlertTitlesEn,
} from '../config/alert-messages.en.js';

const WINDOW_MIN = ALERT_CHECK_WINDOW_MINUTES;
const INTERVAL_MS = ALERT_CHECK_INTERVAL_MS;
const FAILURE_RATE_THRESHOLD = ALERT_FAILURE_RATE_THRESHOLD;
const LATENCY_P95_MS_THRESHOLD = ALERT_LATENCY_P95_MS_THRESHOLD;
const TOKEN_BURN_THRESHOLD = ALERT_TOKEN_BURN_THRESHOLD;
const COOLDOWN_MS = ALERT_COOLDOWN_MS;

const cooldown = new Map<string, number>();
let alertChecksRunning = false;
const ALERT_LOCK_KEY = 'lock:alerts:run';

function shouldNotify(key: string): boolean {
  const now = Date.now();
  const last = cooldown.get(key) ?? 0;
  if (now - last < COOLDOWN_MS) return false;
  cooldown.set(key, now);
  return true;
}

function percentile95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * ALERT_LATENCY_PERCENTILE));
  return sorted[idx];
}

function firstTraceId(events: Array<{ data?: unknown }>): string | undefined {
  for (const event of events) {
    const traceId = (event.data as { trace_id?: string } | null)?.trace_id;
    if (traceId) return traceId;
  }
  return undefined;
}

function renderTraceLinks(traceId?: string): string {
  if (!traceId) return '';
  const sentryTemplate = process.env.SENTRY_TRACE_LINK_TEMPLATE;
  const traceTemplate = process.env.TRACE_LINK_TEMPLATE;
  const sentryLink = sentryTemplate ? sentryTemplate.replace('{trace_id}', traceId) : undefined;
  const traceLink = traceTemplate ? traceTemplate.replace('{trace_id}', traceId) : undefined;
  const parts = [sentryLink ? `Sentry: ${sentryLink}` : null, traceLink ? `Trace: ${traceLink}` : null].filter(Boolean);
  return parts.length > 0 ? `\n${parts.join('\n')}` : `\ntrace_id=${traceId}`;
}

export async function runAlertChecks(): Promise<void> {
  const since = new Date(Date.now() - WINDOW_MIN * 60 * 1000).toISOString();

  const { data: events } = await supabase
    .from('pipeline_events')
    .select('audit_id,phase,event_type,created_at,data')
    .gte('created_at', since);

  const started = (events ?? []).filter(e => e.event_type === 'started').length;
  const failed = (events ?? []).filter(e => e.event_type === 'error').length;
  const traceId = firstTraceId(events ?? []);
  const failureRate = started > 0 ? failed / started : 0;

  if (failureRate >= FAILURE_RATE_THRESHOLD && shouldNotify('failure_rate')) {
    await emitStructuredNotification({
      category: 'pipeline',
      event: 'alert_failure_rate_high',
      priority: 'critical',
      audience: 'consultants',
      title: pipelineAlertTitlesEn.failureRateHigh,
      message: formatPipelineFailureRateMessageEn({
        failureRatePct: (failureRate * 100).toFixed(1),
        failed,
        started,
        windowMin: WINDOW_MIN,
        traceSuffix: renderTraceLinks(traceId),
      }),
      payload: { started, failed, window_minutes: WINDOW_MIN, trace_id: traceId },
      sendInApp: true,
      sendTelegram: true,
    });
  }

  const starts = new Map<string, number>();
  const latencies: number[] = [];
  for (const event of events ?? []) {
    const key = `${event.audit_id}:${event.phase}`;
    if (event.event_type === 'started') {
      starts.set(key, new Date(event.created_at as string).getTime());
    }
    if (event.event_type === 'completed' || event.event_type === 'error') {
      const startedAt = starts.get(key);
      if (startedAt) {
        latencies.push(new Date(event.created_at as string).getTime() - startedAt);
      }
    }
  }

  const p95 = percentile95(latencies);
  if (p95 >= LATENCY_P95_MS_THRESHOLD && shouldNotify('latency_p95')) {
    await emitStructuredNotification({
      category: 'pipeline',
      event: 'alert_latency_p95_high',
      priority: 'medium',
      audience: 'consultants',
      title: pipelineAlertTitlesEn.latencyP95High,
      message: formatPipelineLatencyP95MessageEn({
        p95Ms: Math.round(p95),
        windowMin: WINDOW_MIN,
        thresholdMs: LATENCY_P95_MS_THRESHOLD,
        traceSuffix: renderTraceLinks(traceId),
      }),
      payload: { p95_ms: Math.round(p95), threshold_ms: LATENCY_P95_MS_THRESHOLD, window_minutes: WINDOW_MIN, trace_id: traceId },
      sendInApp: true,
      sendTelegram: true,
    });
  }

  let tokenBurn = 0;
  for (const event of events ?? []) {
    if (event.event_type !== 'token_usage') continue;
    const total = (event.data as { total_tokens?: number } | null)?.total_tokens ?? 0;
    tokenBurn += total;
  }

  if (tokenBurn >= TOKEN_BURN_THRESHOLD && shouldNotify('token_burn')) {
    await emitStructuredNotification({
      category: 'pipeline',
      event: 'alert_token_burn_high',
      priority: 'medium',
      audience: 'consultants',
      title: pipelineAlertTitlesEn.tokenBurnHigh,
      message: formatPipelineTokenBurnMessageEn({
        tokenBurn,
        windowMin: WINDOW_MIN,
        threshold: TOKEN_BURN_THRESHOLD,
        traceSuffix: renderTraceLinks(traceId),
      }),
      payload: { token_burn: tokenBurn, threshold: TOKEN_BURN_THRESHOLD, window_minutes: WINDOW_MIN, trace_id: traceId },
      sendInApp: true,
      sendTelegram: true,
    });
  }
}

export function startAlertsWorker(): void {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;
  setInterval(async () => {
    if (alertChecksRunning) {
      logger.warn('Alert worker tick skipped: previous run still active');
      return;
    }
    const redis = getSharedRedisClient();
    const lockToken = `${process.pid}:${Date.now()}`;
    if (redis) {
      const lock = await redis.set(ALERT_LOCK_KEY, lockToken, { NX: true, PX: ALERT_LOCK_TTL_MS });
      if (lock !== 'OK') {
        logger.debug('Alert worker tick skipped: distributed lock held');
        return;
      }
    }
    alertChecksRunning = true;
    runAlertChecks().catch((err: Error) => logger.error('Alert worker failed', { error: err.message }))
      .finally(() => {
        alertChecksRunning = false;
        if (redis) {
          void redis.get(ALERT_LOCK_KEY).then((value) => {
            if (value === lockToken) {
              return redis.del(ALERT_LOCK_KEY);
            }
            return 0;
          });
        }
      });
  }, INTERVAL_MS);
  setInterval(() => {
    cleanupExpiredIdempotencyKeys()
      .then((count) => {
        if (count > 0) logger.info('Expired idempotency keys cleaned', { deleted: count });
      })
      .catch((err: Error) => logger.error('Idempotency cleanup failed', { error: err.message }));
  }, INTERVAL_MS * 5);
  logger.info('Alert worker started', { interval_ms: INTERVAL_MS });
}
