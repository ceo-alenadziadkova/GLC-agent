import { supabase } from './supabase';

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

async function sendLog(payload: LogPayload) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/api/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Swallow logging errors to avoid breaking UX
  }
}

function baseLog(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const traceId = randomHex(16);
  const operationId = crypto.randomUUID();
  const payload: LogPayload = {
    level,
    source: 'frontend',
    message,
    context,
    timestamp: new Date().toISOString(),
    trace_id: traceId,
    operation_id: operationId,
  };
  // Send remote logs and keep dev console visibility.
  void sendLog(payload);
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console[level]?.(`[${payload.level.toUpperCase()}] ${payload.message}`, payload.context ?? {});
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => baseLog('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => baseLog('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => baseLog('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => baseLog('error', message, context),
};

