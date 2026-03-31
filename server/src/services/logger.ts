import { getContext } from './observability-context.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogRecord {
  level: LogLevel;
  message: string;
  ts: string;
  trace_id?: string;
  operation_id?: string;
  user_id?: string;
  audit_id?: string;
  context?: Record<string, unknown>;
}

function write(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const reqCtx = getContext();
  const payload: LogRecord = {
    level,
    message,
    ts: new Date().toISOString(),
    trace_id: reqCtx?.traceId,
    operation_id: reqCtx?.operationId,
    user_id: reqCtx?.userId,
    audit_id: reqCtx?.auditId,
    context,
  };
  const line = JSON.stringify(payload);
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
