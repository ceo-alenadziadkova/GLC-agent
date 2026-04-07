import { getClientEnvironmentSummary } from './client-environment';
import { supabase } from './supabase';
import { isAnonymousUser } from './snapshot-auth';
import { getApiBaseUrl } from './api-base-url';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogPayload {
  level: LogLevel;
  source: 'frontend';
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  trace_id: string;
  operation_id: string;
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

/** After a 429, pause remote ingest to avoid hammering the API and console noise. */
let remoteLogBackoffUntil = 0;

async function sendLog(payload: LogPayload) {
  try {
    if (Date.now() < remoteLogBackoffUntil) {
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const base = getApiBaseUrl();
    const trySnapshotFirst = isAnonymousUser(session.user);

    async function post(path: '/api/log' | '/api/log/snapshot') {
      return fetch(`${base}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });
    }

    let res = trySnapshotFirst ? await post('/api/log/snapshot') : await post('/api/log');
    if (!trySnapshotFirst && res.status === 403) {
      res = await post('/api/log/snapshot');
    }

    if (res.status === 429) {
      remoteLogBackoffUntil = Date.now() + 90_000;
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn('[logger] Remote ingest rate-limited (429); pausing backend log POSTs for 90s');
      }
    }
  } catch {
    // Swallow logging errors to avoid breaking UX
  }
}

function baseLog(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const traceId = randomHex(16);
  const operationId = crypto.randomUUID();
  const mergedContext = {
    client_env: getClientEnvironmentSummary(),
    ...context,
  };
  const payload: LogPayload = {
    level,
    source: 'frontend',
    message,
    context: mergedContext,
    timestamp: new Date().toISOString(),
    trace_id: traceId,
    operation_id: operationId,
  };
  // Send remote logs and keep dev console visibility.
  void sendLog(payload);
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console[level]?.(`[${payload.level.toUpperCase()}] ${payload.message}`, mergedContext);
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => baseLog('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => baseLog('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => baseLog('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => baseLog('error', message, context),
};

