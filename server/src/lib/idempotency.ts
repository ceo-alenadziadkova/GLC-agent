import type { AuthRequest } from '../middleware/auth.js';
import { supabase } from '../services/supabase.js';
import { logger } from '../services/logger.js';

const TTL_HOURS = 24;

export interface IdempotentResponse {
  statusCode: number;
  payload: Record<string, unknown>;
}

function safeStringify(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== 'object') return JSON.stringify(value);
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(val as Record<string, unknown>).sort()) {
        sorted[key] = (val as Record<string, unknown>)[key];
      }
      return sorted;
    }
    return val;
  });
}

function getKey(req: AuthRequest): string | null {
  const raw = req.header('Idempotency-Key') ?? req.header('idempotency-key');
  if (!raw) return null;
  return raw.trim().slice(0, 128);
}

export async function getStoredIdempotentResponse(
  req: AuthRequest,
  route: string,
  body: unknown
): Promise<{ key: string | null; replay?: IdempotentResponse; hash?: string }> {
  const key = getKey(req);
  if (!key || !req.userId) return { key: null };

  const hash = safeStringify(body);
  const { data } = await supabase
    .from('api_idempotency_keys')
    .select('request_hash, response_status, response_body, expires_at')
    .eq('user_id', req.userId)
    .eq('route', route)
    .eq('idempotency_key', key)
    .single();

  if (!data) return { key, hash };

  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { key, hash };
  }

  if (data.request_hash !== hash) {
    throw new Error('Idempotency key reuse with different payload is not allowed');
  }

  logger.info('Idempotent replay', { route });
  return {
    key,
    hash,
    replay: {
      statusCode: data.response_status as number,
      payload: (data.response_body as Record<string, unknown>) ?? {},
    },
  };
}

export async function storeIdempotentResponse(
  req: AuthRequest,
  route: string,
  key: string | null,
  hash: string | undefined,
  response: IdempotentResponse,
  auditId?: string
): Promise<void> {
  if (!key || !hash || !req.userId) return;
  const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000).toISOString();

  await supabase.from('api_idempotency_keys').upsert(
    {
      user_id: req.userId,
      route,
      idempotency_key: key,
      request_hash: hash,
      response_status: response.statusCode,
      response_body: response.payload,
      audit_id: auditId ?? null,
      expires_at: expiresAt,
    },
    { onConflict: 'user_id,route,idempotency_key' }
  );
}

export async function cleanupExpiredIdempotencyKeys(): Promise<number> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('api_idempotency_keys')
    .delete()
    .lt('expires_at', nowIso)
    .select('id');
  if (error) {
    logger.error('Failed to cleanup expired idempotency keys', { error: error.message });
    return 0;
  }
  return data?.length ?? 0;
}
