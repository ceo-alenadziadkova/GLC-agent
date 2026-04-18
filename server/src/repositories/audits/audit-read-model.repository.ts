import { supabase } from '../../services/supabase.js';
import { safeOrUserFilter } from '../../lib/postgrest-filter.js';

export async function listAuditsByUser(args: { userId: string; offset: number; limit: number }) {
  const userFilter = safeOrUserFilter(args.userId);
  return supabase
    .from('audits')
    .select(
      'id, company_url, company_name, industry, product_mode, status, current_phase, overall_score, tokens_used, created_at, updated_at, no_public_website',
      { count: 'exact' },
    )
    .or(userFilter)
    .order('created_at', { ascending: false })
    .range(args.offset, args.offset + args.limit - 1);
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
