/**
 * Logger observability (infrastructure ENV). Resolved once per call sites in `services/logger.ts`.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: ReadonlySet<string> = new Set(['debug', 'info', 'warn', 'error']);

export function getEffectiveMinLogLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (raw && LEVELS.has(raw)) return raw as LogLevel;
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

export function getLogServiceName(): string {
  return (process.env.LOG_SERVICE ?? 'glc-api').trim() || 'glc-api';
}

export function getLogFormat(): 'json' | 'pretty' {
  const raw = process.env.LOG_FORMAT?.trim().toLowerCase();
  if (raw === 'json' || raw === 'pretty') return raw;
  return process.env.NODE_ENV === 'production' ? 'json' : 'pretty';
}
