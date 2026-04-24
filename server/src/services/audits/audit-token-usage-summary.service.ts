import { canManagePlatformSettings } from '../../lib/platform-admin.js';
import {
  listAuditsByUser,
  rpcAuditTokenTotalsForUser,
  rpcAuditTokenTotalsGlobal,
} from '../../repositories/audits/audit-read-model.repository.js';
import { supabase } from '../../services/supabase.js';
import { parseAuditsPagination } from './audits-read.service.js';

const PLATFORM_SETTINGS_SINGLETON_ID = 1;

async function fetchLlmTokenPoolCap(): Promise<number | null> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('llm_token_pool_cap')
    .eq('id', PLATFORM_SETTINGS_SINGLETON_ID)
    .maybeSingle();

  if (error || !data) return null;
  const raw = (data as { llm_token_pool_cap?: unknown }).llm_token_pool_cap;
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function getAuditTokenUsageSummary(
  userId: string,
  query: { limit?: string | number; offset?: string | number },
) {
  const { limit, offset } = parseAuditsPagination(query);
  const [listRes, totalsRes] = await Promise.all([
    listAuditsByUser({ userId, limit, offset }),
    rpcAuditTokenTotalsForUser(userId),
  ]);

  if (listRes.error) throw listRes.error;
  if (totalsRes.error) throw totalsRes.error;

  const sumRow = Array.isArray(totalsRes.data) ? totalsRes.data[0] : totalsRes.data;
  const sumUsed = Number((sumRow as { sum_tokens_used?: unknown })?.sum_tokens_used ?? 0);
  const sumBudget = Number((sumRow as { sum_token_budget?: unknown })?.sum_token_budget ?? 0);
  const sumRemaining = Number(
    (sumRow as { sum_tokens_remaining_nonneg?: unknown })?.sum_tokens_remaining_nonneg ?? 0,
  );

  const audits = (listRes.data ?? []).map((row) => {
    const used = Number(row.tokens_used ?? 0);
    const budget = Number(row.token_budget ?? 0);
    return {
      id: row.id as string,
      company_url: row.company_url as string,
      company_name: (row.company_name as string | null) ?? null,
      tokens_used: used,
      token_budget: budget,
      tokens_remaining: Math.max(0, budget - used),
      created_at: row.created_at as string,
    };
  });

  const platformManager = await canManagePlatformSettings(userId);
  let platform: {
    pool_cap: number;
    global_tokens_used: number;
    pool_tokens_remaining: number;
  } | null = null;

  if (platformManager) {
    const cap = await fetchLlmTokenPoolCap();
    if (cap !== null) {
      const globalRes = await rpcAuditTokenTotalsGlobal();
      if (globalRes.error) throw globalRes.error;
      const gRow = Array.isArray(globalRes.data) ? globalRes.data[0] : globalRes.data;
      const globalUsed = Number((gRow as { sum_tokens_used?: unknown })?.sum_tokens_used ?? 0);
      platform = {
        pool_cap: cap,
        global_tokens_used: globalUsed,
        pool_tokens_remaining: cap - globalUsed,
      };
    }
  }

  return {
    audits,
    pagination: {
      total: listRes.count ?? 0,
      limit,
      offset,
    },
    scopes: {
      accessible: {
        sum_tokens_used: sumUsed,
        sum_token_budget: sumBudget,
        sum_tokens_remaining: sumRemaining,
      },
      platform,
    },
  };
}
