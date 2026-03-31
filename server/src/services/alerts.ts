import { supabase } from './supabase.js';
import { logger } from './logger.js';

const WINDOW_MIN = 15;
const INTERVAL_MS = Number(process.env.ALERT_INTERVAL_MS ?? '60000');
const FAILURE_RATE_THRESHOLD = Number(process.env.ALERT_FAILURE_RATE_THRESHOLD ?? '0.2');
const LATENCY_P95_MS_THRESHOLD = Number(process.env.ALERT_LATENCY_P95_MS_THRESHOLD ?? '180000');
const TOKEN_BURN_THRESHOLD = Number(process.env.ALERT_TOKEN_BURN_15M_THRESHOLD ?? '300000');
const COOLDOWN_MS = Number(process.env.ALERT_COOLDOWN_MS ?? '900000');

const cooldown = new Map<string, number>();

function shouldNotify(key: string): boolean {
  const now = Date.now();
  const last = cooldown.get(key) ?? 0;
  if (now - last < COOLDOWN_MS) return false;
  cooldown.set(key, now);
  return true;
}

async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!response.ok) {
    logger.warn('Telegram alert failed', { status: response.status });
  }
}

function percentile95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return sorted[idx];
}

export async function runAlertChecks(): Promise<void> {
  const since = new Date(Date.now() - WINDOW_MIN * 60 * 1000).toISOString();

  const { data: events } = await supabase
    .from('pipeline_events')
    .select('audit_id,phase,event_type,created_at,data')
    .gte('created_at', since);

  const started = (events ?? []).filter(e => e.event_type === 'started').length;
  const failed = (events ?? []).filter(e => e.event_type === 'error').length;
  const failureRate = started > 0 ? failed / started : 0;

  if (failureRate >= FAILURE_RATE_THRESHOLD && shouldNotify('failure_rate')) {
    await sendTelegram(
      `ALERT pipeline failure rate high: ${(failureRate * 100).toFixed(1)}% in last ${WINDOW_MIN}m (failed=${failed}, started=${started})`
    );
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
    await sendTelegram(
      `ALERT pipeline latency high: p95=${Math.round(p95)}ms in last ${WINDOW_MIN}m (threshold=${LATENCY_P95_MS_THRESHOLD}ms)`
    );
  }

  let tokenBurn = 0;
  for (const event of events ?? []) {
    if (event.event_type !== 'token_usage') continue;
    const total = (event.data as { total_tokens?: number } | null)?.total_tokens ?? 0;
    tokenBurn += total;
  }

  if (tokenBurn >= TOKEN_BURN_THRESHOLD && shouldNotify('token_burn')) {
    await sendTelegram(
      `ALERT token burn high: ${tokenBurn} tokens in last ${WINDOW_MIN}m (threshold=${TOKEN_BURN_THRESHOLD})`
    );
  }
}

export function startAlertsWorker(): void {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;
  setInterval(() => {
    runAlertChecks().catch((err: Error) => logger.error('Alert worker failed', { error: err.message }));
  }, INTERVAL_MS);
  logger.info('Alert worker started', { interval_ms: INTERVAL_MS });
}
