import { supabase } from '../supabase.js';
import { logger } from '../logger.js';
import { POSTGREST_NO_ROWS_CODE } from '../../config/postgrest-codes.js';

export interface ContextBuilderAuditRow {
  company_url: string | null;
  company_name: string | null;
  industry: string | null;
  product_mode: string | null;
  no_public_website: boolean | null;
  execution_plan: unknown;
}

export interface ContextBuilderBriefRow {
  responses: unknown;
  data_quality_score: unknown;
  readiness_badge: unknown;
  post_audit_questions: unknown;
  recon_prefills: unknown;
  recon_conflicts: unknown;
  collection_mode: unknown;
  intake_versions: unknown;
  collected_by: unknown;
}

export interface ContextBuilderSnapshot {
  audit: ContextBuilderAuditRow;
  recon: Record<string, unknown> | null;
  completedDomains: Array<{
    domain_key: string;
    score: number | null;
    summary: string | null;
    strengths: unknown;
    weaknesses: unknown;
  }> | null;
  failedDomains: Array<{ domain_key: string }> | null;
  reviews: Array<{
    after_phase: number;
    consultant_notes: string | null;
    interview_notes: string | null;
  }> | null;
  brief: ContextBuilderBriefRow | null;
}

export async function loadContextSnapshot(auditId: string): Promise<ContextBuilderSnapshot> {
  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select('company_url, company_name, industry, product_mode, no_public_website, execution_plan')
    .eq('id', auditId)
    .single();

  if (auditError || !audit) {
    throw new Error(`[ContextBuilder] Failed to fetch audit ${auditId}: ${auditError?.message ?? 'not found'}`);
  }

  const { data: recon, error: reconError } = await supabase
    .from('audit_recon')
    .select('*')
    .eq('audit_id', auditId)
    .single();

  if (reconError && reconError.code !== POSTGREST_NO_ROWS_CODE) {
    logger.warn('context_builder.recon_unavailable', {
      component: 'context_builder',
      audit_id: auditId,
      error: reconError.message,
      code: reconError.code,
    });
  }

  const { data: completedDomains } = await supabase
    .from('audit_domains')
    .select('domain_key, score, summary, strengths, weaknesses')
    .eq('audit_id', auditId)
    .eq('status', 'completed')
    .order('phase_number');

  const { data: failedDomains } = await supabase
    .from('audit_domains')
    .select('domain_key')
    .eq('audit_id', auditId)
    .eq('status', 'failed');

  const { data: reviews } = await supabase
    .from('review_points')
    .select('after_phase, consultant_notes, interview_notes')
    .eq('audit_id', auditId)
    .eq('status', 'approved');

  const { data: brief } = await supabase
    .from('intake_brief')
    .select(
      'responses, data_quality_score, readiness_badge, post_audit_questions, recon_prefills, recon_conflicts, collection_mode, intake_versions, collected_by',
    )
    .eq('audit_id', auditId)
    .single();

  return {
    audit: audit as ContextBuilderAuditRow,
    recon: (recon as Record<string, unknown> | null) ?? null,
    completedDomains,
    failedDomains,
    reviews,
    brief: brief as ContextBuilderBriefRow | null,
  };
}
