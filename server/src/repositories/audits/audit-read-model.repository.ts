import { supabase } from '../../services/supabase.js';
import { safeOrUserFilter } from '../../lib/postgrest-filter.js';

export async function listAuditsByUser(args: {
  userId: string;
  offset: number;
  limit: number;
  source?: string[];
  status?: string[];
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  sortBy?: 'created_at' | 'updated_at';
  sortDir?: 'asc' | 'desc';
}) {
  const userFilter = safeOrUserFilter(args.userId);
  let query = supabase
    .from('audits')
    .select(
      'id, user_id, client_id, company_url, company_name, industry, product_mode, origin, execution_plan, status, current_phase, overall_score, snapshot_token, tokens_used, token_budget, created_at, updated_at, no_public_website',
      { count: 'exact' },
    )
    .or(userFilter);
  if (args.source && args.source.length > 0) {
    query = query.in('origin', args.source);
  }
  if (args.status && args.status.length > 0) {
    query = query.in('status', args.status);
  }
  if (args.createdFrom) {
    query = query.gte('created_at', args.createdFrom);
  }
  if (args.createdTo) {
    query = query.lte('created_at', args.createdTo);
  }
  if (args.updatedFrom) {
    query = query.gte('updated_at', args.updatedFrom);
  }
  if (args.updatedTo) {
    query = query.lte('updated_at', args.updatedTo);
  }

  const sortBy = args.sortBy ?? 'created_at';
  const sortDir = args.sortDir ?? 'desc';

  return query
    .order(sortBy, { ascending: sortDir === 'asc' })
    .range(args.offset, args.offset + args.limit - 1);
}

export async function rpcAuditTokenTotalsForUser(userId: string) {
  return supabase.rpc('audit_token_totals_for_user', { p_user_id: userId });
}

export async function rpcAuditTokenTotalsGlobal() {
  return supabase.rpc('audit_token_totals_global');
}

export async function fetchAuditByIdForUser(id: string, userId: string) {
  const userFilter = safeOrUserFilter(userId);
  return supabase.from('audits').select('*').eq('id', id).or(userFilter).single();
}

export async function fetchAuditRelatedReadModel(id: string) {
  return Promise.allSettled([
    supabase.from('audit_recon').select('*').eq('audit_id', id).single(),
    supabase.from('audit_domains').select('*').eq('audit_id', id).order('phase_number'),
    supabase.from('audit_strategy').select('*').eq('audit_id', id).single(),
    supabase.from('review_points').select('*').eq('audit_id', id).order('after_phase'),
    supabase.from('intake_brief').select('*').eq('audit_id', id).single(),
  ]);
}
