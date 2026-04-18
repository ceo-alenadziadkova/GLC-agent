import { supabase } from './supabase.js';
import { logger } from './logger.js';
import { normalizeExecutionPlan } from './execution-plan.js';
import { PIPELINE_MAX_PHASE_INDEX } from '../config/pipeline-phases.js';
import {
  DOMAIN_PHASES,
  executionPlanToPhases,
  reviewPhasesForExecutionPlan,
  type AuditExecutionPlan,
  type ProductMode,
} from '../types/audit.js';
import { AUDIT_CHILD_ROWS_INIT_ROLLBACK_MESSAGE } from '../lib/audit-init-error.js';

export async function createAuditWithChildren(params: {
  ownerUserId: string;
  clientId: string | null;
  company_url: string;
  company_name: string | null;
  industry: string | null;
  mode: ProductMode;
  execution_plan?: AuditExecutionPlan | null;
  no_public_website?: boolean;
}): Promise<{ id: string; status: string }> {
  const {
    ownerUserId,
    clientId,
    company_url,
    company_name,
    industry,
    mode,
    execution_plan,
    no_public_website,
  } = params;

  const { data: audit, error: auditErr } = await supabase
    .from('audits')
    .insert({
      user_id: ownerUserId,
      client_id: clientId,
      company_url,
      company_name,
      industry,
      product_mode: mode,
      execution_plan: execution_plan ?? null,
      no_public_website: no_public_website === true,
    })
    .select()
    .single();

  if (auditErr) throw auditErr;

  const resolvedPlan = execution_plan ?? normalizeExecutionPlan(null, mode);
  const activeDomainKeys = resolvedPlan.selected_domains;
  const activeReviewPhases = reviewPhasesForExecutionPlan(resolvedPlan);

  const reviewInserts = activeReviewPhases.map((phase) => ({
    audit_id: audit.id,
    after_phase: phase,
  }));

  const domainInserts = activeDomainKeys.map((key) => ({
    audit_id: audit.id,
    domain_key: key,
    phase_number: DOMAIN_PHASES[key],
  }));

  const childInserts = [
    supabase.from('review_points').insert(reviewInserts),
    supabase.from('audit_domains').insert(domainInserts),
    supabase.from('audit_recon').insert({ audit_id: audit.id }),
    ...(executionPlanToPhases(resolvedPlan).includes(PIPELINE_MAX_PHASE_INDEX)
      ? [supabase.from('audit_strategy').insert({ audit_id: audit.id })]
      : []),
  ] as const;

  const results = await Promise.allSettled(childInserts);

  const initFailed = results.some((r) => {
    if (r.status === 'rejected') return true;
    // Supabase response shape includes an optional `error` field.
    const maybeError = (r.value as unknown as { error?: unknown }).error;
    return maybeError != null;
  });

  if (initFailed) {
    await supabase.from('audits').delete().eq('id', audit.id); // CASCADE deletes child rows
    logger.error('Audit initialization failed, rollback applied', { audit_id: audit.id });
    throw new Error(AUDIT_CHILD_ROWS_INIT_ROLLBACK_MESSAGE);
  }

  return { id: audit.id as string, status: audit.status as string };
}

