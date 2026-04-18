/**
 * Trace Context constants (W3C traceparent + internal operation header).
 */
export const TRACE_CONTEXT_HEADERS = {
  traceparent: 'traceparent',
  operationId: 'x-operation-id',
} as const;

export const TRACE_CONTEXT_FORMAT = {
  version: '00',
  sampledFlags: '01',
  traceIdHexLength: 32,
  spanIdHexLength: 16,
} as const;
