import { supabase } from './supabase.js';
import { logger } from './logger.js';
import { cleanupExpiredIdempotencyKeys } from '../lib/idempotency.js';
import { cleanupExpiredEvaluationDatasets } from '../lib/evaluation-datasets-retention.js';
import { getSharedRedisClient } from './redis.js';
import { emitStructuredNotification } from './notifications.js';
import {
  ALERT_BOARD_CONFLICT_BURST_THRESHOLD,
  ALERT_CHECK_INTERVAL_MS,
  ALERT_CHECK_WINDOW_MINUTES,
  ALERT_COOLDOWN_MS,
  ALERT_FAILURE_RATE_THRESHOLD,
  ALERT_LATENCY_P95_MS_THRESHOLD,
  ALERT_LOCK_TTL_MS,
  ALERT_TOKEN_BURN_THRESHOLD,
  EVALUATION_DATASETS_CLEANUP_INTERVAL_MS,
  IDEMPOTENCY_CLEANUP_INTERVAL_MS,
} from '../config/alerts-config.js';
import { ALERT_LATENCY_PERCENTILE } from '../config/alert-thresholds.js';
import {
  formatPipelineFailureRateMessageEn,
  formatPipelineLatencyP95MessageEn,
  formatPipelineTokenBurnMessageEn,
  formatPlanBoardConflictBurstMessageEn,
  pipelineAlertTitlesEn,
} from '../config/alert-messages.en.js';
import { PIPELINE_EVENT_TYPES } from '../config/pipeline-event-types.js';
import { REDIS_KEYS } from '../config/redis-keys.js';
import { formatObservabilityTraceSuffixForAlerts } from '../config/trace-link-templates.js';
import { isTelegramBotConfigured } from '../config/telegram-credentials.js';

const WINDOW_MIN = ALERT_CHECK_WINDOW_MINUTES;
const INTERVAL_MS = ALERT_CHECK_INTERVAL_MS;
const FAILURE_RATE_THRESHOLD = ALERT_FAILURE_RATE_THRESHOLD;
const LATENCY_P95_MS_THRESHOLD = ALERT_LATENCY_P95_MS_THRESHOLD;
const TOKEN_BURN_THRESHOLD = ALERT_TOKEN_BURN_THRESHOLD;
const COOLDOWN_MS = ALERT_COOLDOWN_MS;

const cooldown = new Map<string, number>();
let alertChecksRunning = false;
const ALERT_LOCK_KEY = REDIS_KEYS.alertsRunLock;

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

export async function runAlertChecks(): Promise<void> {
  const since = new Date(Date.now() - WINDOW_MIN * 60 * 1000).toISOString();

  const { data: events } = await supabase
    .from('pipeline_events')
    .select('audit_id,phase,event_type,created_at,data')
    .gte('created_at', since);

  const started = (events ?? []).filter(e => e.event_type === PIPELINE_EVENT_TYPES.started).length;
  const failed = (events ?? []).filter(e => e.event_type === PIPELINE_EVENT_TYPES.error).length;
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
        traceSuffix: formatObservabilityTraceSuffixForAlerts(traceId),
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
    if (event.event_type === PIPELINE_EVENT_TYPES.started) {
      starts.set(key, new Date(event.created_at as string).getTime());
    }
    if (event.event_type === PIPELINE_EVENT_TYPES.completed || event.event_type === PIPELINE_EVENT_TYPES.error) {
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
        traceSuffix: formatObservabilityTraceSuffixForAlerts(traceId),
      }),
      payload: { p95_ms: Math.round(p95), threshold_ms: LATENCY_P95_MS_THRESHOLD, window_minutes: WINDOW_MIN, trace_id: traceId },
      sendInApp: true,
      sendTelegram: true,
    });
  }

  let tokenBurn = 0;
  for (const event of events ?? []) {
    if (event.event_type !== PIPELINE_EVENT_TYPES.tokenUsage) continue;
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
        traceSuffix: formatObservabilityTraceSuffixForAlerts(traceId),
      }),
      payload: { token_burn: tokenBurn, threshold: TOKEN_BURN_THRESHOLD, window_minutes: WINDOW_MIN, trace_id: traceId },
      sendInApp: true,
      sendTelegram: true,
    });
  }

  const planBoardBurstTypes = new Set<string>([
    PIPELINE_EVENT_TYPES.planBoardReconciled,
    PIPELINE_EVENT_TYPES.planBoardConflict409,
  ]);
  const planBoardRowsByAudit = new Map<string, Array<{ created_at: string; event_type: string; data?: unknown }>>();
  for (const event of events ?? []) {
    const et = String(event.event_type);
    if (!planBoardBurstTypes.has(et)) continue;
    const aid = String(event.audit_id ?? '');
    if (!aid) continue;
    const list = planBoardRowsByAudit.get(aid) ?? [];
    list.push({ created_at: String(event.created_at), event_type: et, data: event.data });
    planBoardRowsByAudit.set(aid, list);
  }

  for (const [auditKey, planRows] of planBoardRowsByAudit) {
    const sorted = [...planRows].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const firstReconcile = sorted.find(r => r.event_type === PIPELINE_EVENT_TYPES.planBoardReconciled);
    if (!firstReconcile) continue;
    const conflictsAfter = sorted.filter(
      r => r.event_type === PIPELINE_EVENT_TYPES.planBoardConflict409 && r.created_at > firstReconcile.created_at,
    );
    if (conflictsAfter.length < ALERT_BOARD_CONFLICT_BURST_THRESHOLD) continue;
    if (!shouldNotify(`board_conflict_burst:${auditKey}`)) continue;
    const burstTrace =
      conflictsAfter.map(r => (r.data as { trace_id?: string } | null)?.trace_id).find(Boolean) ??
      firstTraceId(events ?? []);
    await emitStructuredNotification({
      category: 'pipeline',
      event: 'alert_plan_board_conflict_burst_post_reconcile',
      priority: 'medium',
      audience: 'consultants',
      title: pipelineAlertTitlesEn.planBoardConflictBurstPostReconcile,
      message: formatPlanBoardConflictBurstMessageEn({
        auditId: auditKey,
        conflictCount: conflictsAfter.length,
        threshold: ALERT_BOARD_CONFLICT_BURST_THRESHOLD,
        windowMin: WINDOW_MIN,
        traceSuffix: formatObservabilityTraceSuffixForAlerts(burstTrace),
      }),
      auditId: auditKey,
      payload: {
        audit_id: auditKey,
        conflict_count: conflictsAfter.length,
        threshold: ALERT_BOARD_CONFLICT_BURST_THRESHOLD,
        window_minutes: WINDOW_MIN,
        trace_id: burstTrace,
      },
      sendInApp: true,
      sendTelegram: true,
    });
  }
}

export function startAlertsWorker(): void {
  if (!isTelegramBotConfigured()) return;
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
  }, IDEMPOTENCY_CLEANUP_INTERVAL_MS);
  setInterval(() => {
    cleanupExpiredEvaluationDatasets()
      .then((count) => {
        if (count > 0) logger.info('Expired evaluation_datasets cleaned', { deleted: count });
      })
      .catch((err: Error) => logger.error('evaluation_datasets cleanup failed', { error: err.message }));
  }, EVALUATION_DATASETS_CLEANUP_INTERVAL_MS);
  logger.info('Alert worker started', { interval_ms: INTERVAL_MS });
}
