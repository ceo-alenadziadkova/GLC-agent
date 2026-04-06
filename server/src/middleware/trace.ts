import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { runWithContext } from '../services/observability-context.js';

function newTraceId(): string {
  return randomUUID().replace(/-/g, '');
}

function newSpanId(): string {
  return randomUUID().replace(/-/g, '').slice(0, 16);
}

function parseTraceparent(header?: string): string | undefined {
  if (!header) return undefined;
  const parts = header.split('-');
  if (parts.length < 4) return undefined;
  const traceId = parts[1];
  if (!traceId || traceId.length !== 32) return undefined;
  return traceId;
}

export function traceMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('traceparent');
  const traceId = parseTraceparent(incoming) ?? newTraceId();
  const operationId = req.header('x-operation-id') ?? randomUUID();
  const spanId = newSpanId();
  const traceparent = `00-${traceId}-${spanId}-01`;

  res.setHeader('traceparent', traceparent);
  res.setHeader('x-operation-id', operationId);

  runWithContext({ traceId, operationId }, () => next());
}
