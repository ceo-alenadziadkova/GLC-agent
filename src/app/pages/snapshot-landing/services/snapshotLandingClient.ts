import { API_PATHS } from '../../../config/api-paths';
import { snapshotPublicRequest } from '../../../data/apiService';
import type { FreeSnapshotPreview } from '../../../data/auditTypes';
import type { SnapshotApiErrorPayload } from '../../../lib/snapshot-api-errors';
import { toSnapshotStatusResponse, type SnapshotStatusResponse } from './snapshotLandingDto';

export type RateLimitNumbers = { limit: number; remaining: number };

export function parseRateLimitHeaders(headers: Headers): RateLimitNumbers | null {
  const lim = headers.get('RateLimit-Limit');
  const rem = headers.get('RateLimit-Remaining');
  if (lim == null || rem == null) return null;

  const l = parseInt(lim, 10);
  const r = parseInt(rem, 10);
  if (Number.isNaN(l) || Number.isNaN(r)) return null;

  return { limit: l, remaining: r };
}

export function parseRateLimitFromPayload(payload: SnapshotApiErrorPayload): RateLimitNumbers | null {
  if (typeof payload.limit !== 'number') return null;
  return {
    limit: payload.limit,
    remaining: typeof payload.remaining === 'number' ? payload.remaining : 0,
  };
}

export async function getQuotaPreview(signal?: AbortSignal): Promise<RateLimitNumbers | null> {
  try {
    const res = await snapshotPublicRequest(API_PATHS.snapshotQuota, { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { remaining?: number; limit?: number };
    if (typeof data.remaining === 'number' && typeof data.limit === 'number') {
      return { remaining: data.remaining, limit: data.limit };
    }
    return null;
  } catch {
    /* ignore — page still works without preview */
    return null;
  }
}

export type StartSnapshotResult =
  | { ok: true; snapshotToken: string; rateLimitHeaders: RateLimitNumbers | null }
  | { ok: false; status: number; payload: SnapshotApiErrorPayload; rateLimitFromPayload: RateLimitNumbers | null };

export async function startSnapshot(companyUrl: string, options?: { signal?: AbortSignal }): Promise<StartSnapshotResult> {
  const res = await snapshotPublicRequest(API_PATHS.snapshot, {
    ...options,
    method: 'POST',
    body: JSON.stringify({ company_url: companyUrl }),
  });

  const data = (await res.json()) as SnapshotApiErrorPayload;
  const rateLimitFromPayload = parseRateLimitFromPayload(data);

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      payload: data,
      rateLimitFromPayload,
    };
  }

  const snapshotToken = typeof data.snapshot_token === 'string' ? data.snapshot_token : '';
  return {
    ok: true,
    snapshotToken,
    rateLimitHeaders: parseRateLimitHeaders(res.headers),
  };
}

export async function fetchSnapshotStatus(
  snapshotToken: string,
  options: { signal: AbortSignal },
): Promise<SnapshotStatusResponse> {
  const res = await snapshotPublicRequest(`${API_PATHS.snapshot}/${snapshotToken}`, {
    signal: options.signal,
  });

  const data = (await res.json()) as FreeSnapshotPreview | SnapshotApiErrorPayload;
  return toSnapshotStatusResponse(res.status, res.ok, data);
}

