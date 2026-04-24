import { DIRECTOR_DEEP_DIVE_QUOTA_BY_PACKAGE } from '../../config/director-orchestration-policy.js';
import { DIRECTOR_DEEP_DIVE_QUEUE } from '../../config/director-deep-dive-queue.js';
import { loadAuditExecutionPlanRow } from './orchestration-read.service.js';
import { supabase } from '../supabase.js';

export type DirectorDeepDiveQuotaState = {
  coverage_package: 'starter' | 'pro' | 'complete';
  per_domain_limit: number;
  used_count: number;
  remaining: number;
};

/**
 * Deep-dive quota for an audit domain: compare package limit to job_runs rows
 * (same convention as enqueue — queued/running/completed consume the slot budget).
 */
export async function getDirectorDeepDiveQuotaForDomain(args: {
  auditId: string;
  userId: string;
  domainKey: string;
}): Promise<DirectorDeepDiveQuotaState | null> {
  const plan = await loadAuditExecutionPlanRow(args.auditId, args.userId);
  if (!plan) return null;
  const coveragePackage = plan.plan.coverage_package ?? 'starter';
  const perDomainLimit = DIRECTOR_DEEP_DIVE_QUOTA_BY_PACKAGE[coveragePackage].perDomainPerAudit;
  const { count, error } = await supabase
    .from('job_runs')
    .select('queue_job_id', { count: 'exact', head: true })
    .eq('queue_name', DIRECTOR_DEEP_DIVE_QUEUE.queueName)
    .eq('audit_id', args.auditId)
    .eq('action', `deep_dive:${args.domainKey}`)
    .in('status', ['queued', 'running', 'completed']);
  if (error) return null;
  const used = count ?? 0;
  const remaining = Math.max(0, perDomainLimit - used);
  return {
    coverage_package: coveragePackage,
    per_domain_limit: perDomainLimit,
    used_count: used,
    remaining,
  };
}
