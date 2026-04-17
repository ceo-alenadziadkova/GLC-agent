import {
  DEFAULT_AUDIT_PRODUCT_MODE,
  type AuditExecutionPlan,
  type ProductMode,
} from '../../../types/audit.js';
import { normalizeExecutionPlan } from '../../execution-plan.js';
import { supabase } from '../../supabase.js';

/**
 * Normalizes execution plan + product mode from an audit row shape (in-memory or DB).
 * Shared by the orchestrator and HTTP route services.
 */
export function normalizeExecutionPlanFromAuditFields(audit: {
  execution_plan?: Partial<AuditExecutionPlan> | null;
  product_mode?: string | null;
}): AuditExecutionPlan {
  return normalizeExecutionPlan(
    audit.execution_plan ?? null,
    (audit.product_mode as ProductMode | undefined) ?? DEFAULT_AUDIT_PRODUCT_MODE,
  );
}

export async function loadNormalizedExecutionPlanForAudit(auditId: string): Promise<AuditExecutionPlan> {
  const { data } = await supabase
    .from('audits')
    .select('execution_plan, product_mode')
    .eq('id', auditId)
    .single();
  return normalizeExecutionPlanFromAuditFields({
    execution_plan: (data?.execution_plan as Partial<AuditExecutionPlan> | null | undefined) ?? null,
    product_mode: data?.product_mode ?? null,
  });
}
