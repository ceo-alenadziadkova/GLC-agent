import { supabase } from './supabase';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogPayload {
  level: LogLevel;
  source: 'frontend';
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
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
  const payload: LogPayload = {
    level,
    source: 'frontend',
    message,
    context,
    timestamp: new Date().toISOString(),
  };
  // Логируем как в удалённый лог-сервис, так и в консоль разработчика (в dev)
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

