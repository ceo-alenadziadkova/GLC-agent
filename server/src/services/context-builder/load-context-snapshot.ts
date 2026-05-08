import { supabase } from '../supabase.js';
import { logger } from '../logger.js';
import {
  POSTGRES_UNDEFINED_TABLE_CODE,
  POSTGREST_NO_ROWS_CODE,
} from '../../config/postgrest-codes.js';

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
  retryNotes: Array<{
    phase: number;
    retry_comment: string;
    created_at: string;
  }> | null;
  brief: ContextBuilderBriefRow | null;
  clientSituation: Record<string, unknown> | null;
  hypothesisDrafts: Array<Record<string, unknown>>;
  alignmentResponses: Array<Record<string, unknown>>;
  conflictResolution: Record<string, unknown> | null;
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
    .eq('status', 'approved')
    .order('after_phase', { ascending: true });

  const { data: retryEvents } = await supabase
    .from('pipeline_events')
    .select('phase, data, created_at')
    .eq('audit_id', auditId)
    .eq('event_type', 'log')
    .order('created_at', { ascending: true })
    .limit(200);

  const retryNotes =
    (retryEvents ?? [])
      .map((row) => {
        const data = (row as { data?: unknown }).data;
        if (!data || typeof data !== 'object') return null;
        const payload = data as Record<string, unknown>;
        if (payload.action !== 'retry_requested') return null;
        const retryComment = payload.retry_comment;
        if (typeof retryComment !== 'string' || retryComment.trim().length === 0) return null;
        const phase = typeof (row as { phase?: unknown }).phase === 'number' ? (row as { phase: number }).phase : -1;
        const createdAt = typeof (row as { created_at?: unknown }).created_at === 'string'
          ? (row as { created_at: string }).created_at
          : new Date(0).toISOString();
        return {
          phase,
          retry_comment: retryComment.trim(),
          created_at: createdAt,
        };
      })
      .filter((note): note is { phase: number; retry_comment: string; created_at: string } => note !== null) ?? null;

  const { data: brief } = await supabase
    .from('intake_brief')
    .select(
      'responses, data_quality_score, readiness_badge, post_audit_questions, recon_prefills, recon_conflicts, collection_mode, intake_versions, collected_by',
    )
    .eq('audit_id', auditId)
    .single();

  const { data: clientSituation, error: clientSituationError } = await supabase
    .from('audit_client_situation')
    .select('snapshot')
    .eq('audit_id', auditId)
    .single();
  if (
    clientSituationError
    && clientSituationError.code !== POSTGREST_NO_ROWS_CODE
    && clientSituationError.code !== POSTGRES_UNDEFINED_TABLE_CODE
  ) {
    logger.warn('context_builder.client_situation_unavailable', {
      component: 'context_builder',
      audit_id: auditId,
      error: clientSituationError.message,
      code: clientSituationError.code,
    });
  }

  const { data: hypothesisDraftsData, error: hypothesisDraftsError } = await supabase
    .from('audit_domain_hypotheses')
    .select('domain_key, draft')
    .eq('audit_id', auditId)
    .order('domain_key', { ascending: true });
  if (hypothesisDraftsError && hypothesisDraftsError.code !== POSTGRES_UNDEFINED_TABLE_CODE) {
    logger.warn('context_builder.hypothesis_drafts_unavailable', {
      component: 'context_builder',
      audit_id: auditId,
      error: hypothesisDraftsError.message,
      code: hypothesisDraftsError.code,
    });
  }

  const { data: alignmentResponsesData, error: alignmentResponsesError } = await supabase
    .from('audit_domain_alignments')
    .select('domain_key, alignment')
    .eq('audit_id', auditId)
    .order('domain_key', { ascending: true });
  if (alignmentResponsesError && alignmentResponsesError.code !== POSTGRES_UNDEFINED_TABLE_CODE) {
    logger.warn('context_builder.alignment_responses_unavailable', {
      component: 'context_builder',
      audit_id: auditId,
      error: alignmentResponsesError.message,
      code: alignmentResponsesError.code,
    });
  }

  const { data: conflictResolutionData, error: conflictResolutionError } = await supabase
    .from('audit_conflict_resolutions')
    .select('resolution')
    .eq('audit_id', auditId)
    .single();
  if (
    conflictResolutionError
    && conflictResolutionError.code !== POSTGREST_NO_ROWS_CODE
    && conflictResolutionError.code !== POSTGRES_UNDEFINED_TABLE_CODE
  ) {
    logger.warn('context_builder.conflict_resolution_unavailable', {
      component: 'context_builder',
      audit_id: auditId,
      error: conflictResolutionError.message,
      code: conflictResolutionError.code,
    });
  }

  return {
    audit: audit as ContextBuilderAuditRow,
    recon: (recon as Record<string, unknown> | null) ?? null,
    completedDomains,
    failedDomains,
    reviews,
    retryNotes,
    brief: brief as ContextBuilderBriefRow | null,
    clientSituation: (clientSituation as { snapshot?: unknown } | null)?.snapshot as Record<string, unknown> | null,
    hypothesisDrafts: (hypothesisDraftsData as Array<{ domain_key: string; draft: unknown }> | null)?.map((row) => ({
      domain_key: row.domain_key,
      draft: row.draft,
    })) ?? [],
    alignmentResponses: (
      alignmentResponsesData as Array<{ domain_key: string; alignment: unknown }> | null
    )?.map((row) => ({
      domain_key: row.domain_key,
      alignment: row.alignment,
    })) ?? [],
    conflictResolution:
      ((conflictResolutionData as { resolution?: unknown } | null)?.resolution as Record<string, unknown> | null)
      ?? null,
  };
}
