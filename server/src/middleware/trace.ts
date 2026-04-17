import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { TRACE_CONTEXT_FORMAT, TRACE_CONTEXT_HEADERS } from '../config/trace-context.js';
import { runWithContext } from '../services/observability-context.js';

function newTraceId(): string {
  return randomUUID().replace(/-/g, '');
}

function newSpanId(): string {
  return randomUUID().replace(/-/g, '').slice(0, TRACE_CONTEXT_FORMAT.spanIdHexLength);
}

function parseTraceparent(header?: string): string | undefined {
  if (!header) return undefined;
  const parts = header.split('-');
  if (parts.length < 4) return undefined;
  const traceId = parts[1];
  if (!traceId || traceId.length !== TRACE_CONTEXT_FORMAT.traceIdHexLength) return undefined;
  return traceId;
}

export function traceMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(TRACE_CONTEXT_HEADERS.traceparent);
  const traceId = parseTraceparent(incoming) ?? newTraceId();
  const operationId = req.header(TRACE_CONTEXT_HEADERS.operationId) ?? randomUUID();
  const spanId = newSpanId();
  const traceparent = `${TRACE_CONTEXT_FORMAT.version}-${traceId}-${spanId}-${TRACE_CONTEXT_FORMAT.sampledFlags}`;

  res.setHeader(TRACE_CONTEXT_HEADERS.traceparent, traceparent);
  res.setHeader(TRACE_CONTEXT_HEADERS.operationId, operationId);

  runWithContext({ traceId, operationId }, () => next());
}
