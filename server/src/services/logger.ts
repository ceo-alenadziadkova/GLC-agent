import { getContext } from './observability-context.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogRecord {
  service: string;
  level: LogLevel;
  message: string;
  ts: string;
  trace_id?: string;
  operation_id?: string;
  user_id?: string;
  audit_id?: string;
  context?: Record<string, unknown>;
}

const SERVICE = process.env.LOG_SERVICE ?? 'glc-api';

function logFormat(): 'json' | 'pretty' {
  const raw = process.env.LOG_FORMAT?.toLowerCase();
  if (raw === 'json' || raw === 'pretty') return raw;
  return process.env.NODE_ENV === 'production' ? 'json' : 'pretty';
}

function shortId(id: string | undefined, len = 8): string | undefined {
  if (!id) return undefined;
  return id.length <= len ? id : `${id.slice(0, len)}…`;
}

function formatPretty(record: LogRecord): string {
  const { ts, level, message, trace_id, operation_id, user_id, audit_id, context, service } = record;
  const meta: string[] = [`svc=${service}`];
  if (trace_id) meta.push(`trace=${shortId(trace_id)}`);
  if (operation_id) meta.push(`op=${shortId(operation_id, 6)}`);
  if (user_id) meta.push(`user=${shortId(user_id)}`);
  if (audit_id) meta.push(`audit=${shortId(audit_id)}`);
  const head = `${ts} ${level.toUpperCase().padEnd(5)} [${meta.join(' ')}] ${message}`;
  if (!context || Object.keys(context).length === 0) {
    return head;
  }
  const ctx = JSON.stringify(context, null, 2);
  const singleLine = ctx.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= 160) {
    return `${head} ${singleLine}`;
  }
  return `${head}\n  ${ctx.split('\n').join('\n  ')}`;
}

function write(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const reqCtx = getContext();
  const payload: LogRecord = {
    service: SERVICE,
    level,
    message,
    ts: new Date().toISOString(),
    trace_id: reqCtx?.traceId,
    operation_id: reqCtx?.operationId,
    user_id: reqCtx?.userId,
    audit_id: reqCtx?.auditId,
    context,
  };

  const fmt = logFormat();
  const line = fmt === 'json' ? JSON.stringify(payload) : formatPretty(payload);

  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.log(line);
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'production') write('debug', message, context);
  },
  info(message: string, context?: Record<string, unknown>) {
    write('info', message, context);
  },
  warn(message: string, context?: Record<string, unknown>) {
    write('warn', message, context);
  },
  error(message: string, context?: Record<string, unknown>) {
    write('error', message, context);
  },
};
