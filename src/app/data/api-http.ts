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

  // 30s timeout — prevents hanging indefinitely if server is unreachable
  const timeoutSignal = AbortSignal.timeout(30_000);
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
    };
    const code = typeof error.code === 'string' ? error.code : undefined;
    throw new ApiError(error.error ?? `API error: ${response.status}`, response.status, code);
  }

  return response.json();
}

/** Public intake/snapshot calls — no Authorization header. */
export async function publicApiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  // 30s timeout — same as authenticated apiFetch
  const timeoutSignal = AbortSignal.timeout(30_000);
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
  const timeoutSignal = AbortSignal.timeout(30_000);
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
