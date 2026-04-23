import { API_CLIENT_TIMEOUT_MS } from '../config/http-client-defaults';
import { supabase } from '../lib/supabase';
import { getApiBaseUrl } from '../lib/api-base-url';
import { ApiError } from './api-error';

export const API_URL = getApiBaseUrl();

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export function createTraceparent(): string {
  const traceId = randomHex(16);
  const spanId = randomHex(8);
  return `00-${traceId}-${spanId}-01`;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = await getAuthHeaders();

  const timeoutSignal = AbortSignal.timeout(API_CLIENT_TIMEOUT_MS);
  const signal = options.signal
    ? AbortSignal.any([options.signal as AbortSignal, timeoutSignal])
    : timeoutSignal;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    signal,
    headers: {
      'Content-Type': 'application/json',
      traceparent: createTraceparent(),
      'x-operation-id': crypto.randomUUID(),
      ...authHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ error: response.statusText }))) as {
      error?: string;
      code?: unknown;
      details?: unknown;
    };
    const code = typeof error.code === 'string' ? error.code : undefined;
    throw new ApiError(error.error ?? `API error: ${response.status}`, response.status, code, error.details);
  }

  return response.json();
}

/** GET JSON with optional `If-None-Match` — returns `not_modified` for HTTP 304 (no body). */
export type ApiGetJsonOrNotModifiedResult<T> = { kind: 'ok'; data: T } | { kind: 'not_modified' };

export async function apiGetJsonOrNotModified<T>(
  path: string,
  options: { ifNoneMatch?: string } = {},
): Promise<ApiGetJsonOrNotModifiedResult<T>> {
  const authHeaders = await getAuthHeaders();
  const timeoutSignal = AbortSignal.timeout(API_CLIENT_TIMEOUT_MS);
  const response = await fetch(`${API_URL}${path}`, {
    method: 'GET',
    signal: timeoutSignal,
    headers: {
      traceparent: createTraceparent(),
      'x-operation-id': crypto.randomUUID(),
      ...authHeaders,
      ...(options.ifNoneMatch ? { 'If-None-Match': options.ifNoneMatch } : {}),
    },
  });

  if (response.status === 304) {
    return { kind: 'not_modified' };
  }

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ error: response.statusText }))) as {
      error?: string;
      code?: unknown;
      details?: unknown;
    };
    const code = typeof error.code === 'string' ? error.code : undefined;
    throw new ApiError(error.error ?? `API error: ${response.status}`, response.status, code, error.details);
  }

  return { kind: 'ok', data: (await response.json()) as T };
}

/** Public intake/snapshot calls — no Authorization header. */
export async function publicApiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const timeoutSignal = AbortSignal.timeout(API_CLIENT_TIMEOUT_MS);
  const signal = options.signal
    ? AbortSignal.any([options.signal as AbortSignal, timeoutSignal])
    : timeoutSignal;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    signal,
    headers: {
      'Content-Type': 'application/json',
      traceparent: createTraceparent(),
      'x-operation-id': crypto.randomUUID(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new ApiError(error.error ?? `API error: ${response.status}`, response.status);
  }

  return response.json();
}

/**
 * Public snapshot API — guest httpOnly cookie, trace headers, optional JSON body.
 * Returns the raw Response (status, RateLimit-*, body) for snapshot-specific error handling.
 */
export async function snapshotPublicRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(API_CLIENT_TIMEOUT_MS);
  const signal = options.signal
    ? AbortSignal.any([options.signal as AbortSignal, timeoutSignal])
    : timeoutSignal;
  const hasBody = options.body != null;
  return fetch(`${API_URL}${path}`, {
    ...options,
    signal,
    credentials: options.credentials ?? 'include',
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      traceparent: createTraceparent(),
      'x-operation-id': crypto.randomUUID(),
      ...options.headers,
    },
  });
}

type ApiPostAckOptions = RequestInit & { clientTimeoutMs?: number };

/**
 * POST JSON as an authenticated user; success is any 2xx with no response body parse (e.g. 204).
 */
export async function apiPostAck(path: string, body: unknown, options: ApiPostAckOptions = {}): Promise<void> {
  const { clientTimeoutMs, ...fetchInit } = options;
  const authHeaders = await getAuthHeaders();
  const timeoutMs = clientTimeoutMs ?? API_CLIENT_TIMEOUT_MS;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = fetchInit.signal
    ? AbortSignal.any([fetchInit.signal as AbortSignal, timeoutSignal])
    : timeoutSignal;

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchInit,
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      traceparent: createTraceparent(),
      'x-operation-id': crypto.randomUUID(),
      ...authHeaders,
      ...fetchInit.headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ error: response.statusText }))) as {
      error?: string;
      code?: unknown;
      details?: unknown;
    };
    const code = typeof error.code === 'string' ? error.code : undefined;
    throw new ApiError(error.error ?? `API error: ${response.status}`, response.status, code, error.details);
  }
}
