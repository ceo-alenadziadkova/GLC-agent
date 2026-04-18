import {
  buildIntakePlan,
  choiceSpecifyResponseKey,
  INTAKE_REVENUE_BANK_ID,
} from '@glc/intake-core';

import { INTAKE_IDENTITY_FIELD_IDS } from '../../schemas/intake-brief.js';
import { saveBriefResponses } from '../brief-validator.js';
import { supabase } from '../supabase.js';
import { DEFAULT_AUDIT_PRODUCT_MODE } from '../../types/audit.js';
import {
  INTAKE_PREBRIEF_PUBLIC_PLAN_COLLECTION_MODE,
  INTAKE_PREBRIEF_PUBLIC_PLAN_SURFACE,
} from '../../config/intake-prebrief-route-policy.js';

export type MergePreBriefOutcome = 'merged' | 'nothing_to_merge' | 'consultant_not_audit_owner';

export function toClientEntries(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v != null && typeof v === 'object' && !Array.isArray(v) && 'value' in (v as Record<string, unknown>)) {
      out[k] = { ...(v as Record<string, unknown>), source: 'client' };
    } else {
      out[k] = { value: v, source: 'client' };
    }
  }
  return out;
}

/**
 * Whitelist keys merged into `intake_brief` from token submit: `visible` slice, identity, revenue + specify companions.
 */
export function buildPreBriefMergeKeySet(visible: readonly string[]): Set<string> {
  const mergeIds = new Set<string>([
    ...visible,
    ...INTAKE_IDENTITY_FIELD_IDS,
    INTAKE_REVENUE_BANK_ID,
    choiceSpecifyResponseKey(INTAKE_REVENUE_BANK_ID),
  ]);
  const specifyScopeIds = [...visible, ...INTAKE_IDENTITY_FIELD_IDS];
  for (const id of specifyScopeIds) {
    mergeIds.add(choiceSpecifyResponseKey(id));
  }
  return mergeIds;
}

/**
 * Merges token submit cells into `intake_brief.responses` (whitelist only).
 */
export async function mergePreBriefFromParsedResponses(
  auditId: string,
  consultantUserId: string,
  parsed: Record<string, unknown>,
): Promise<MergePreBriefOutcome> {
  const { data: auditRow, error: auditErr } = await supabase
    .from('audits')
    .select('user_id')
    .eq('id', auditId)
    .single();
  if (auditErr || !auditRow || auditRow.user_id !== consultantUserId) {
    return 'consultant_not_audit_owner';
  }

  const { data: brief } = await supabase
    .from('intake_brief')
    .select('responses')
    .eq('audit_id', auditId)
    .maybeSingle();
  const existing = (brief?.responses as Record<string, unknown>) ?? {};
  const preBriefPatch: Record<string, unknown> = {};
  const entries = toClientEntries(parsed);
  const mergedForPlan = { ...existing, ...entries };
  const preBriefPlan = buildIntakePlan({
    responses: mergedForPlan,
    productMode: DEFAULT_AUDIT_PRODUCT_MODE,
    collectionMode: INTAKE_PREBRIEF_PUBLIC_PLAN_COLLECTION_MODE,
    surface: INTAKE_PREBRIEF_PUBLIC_PLAN_SURFACE,
  });
  const mergeIds = buildPreBriefMergeKeySet(preBriefPlan.visible);
  for (const id of mergeIds) {
    if (entries[id] !== undefined) preBriefPatch[id] = entries[id];
  }
  if (Object.keys(preBriefPatch).length === 0) return 'nothing_to_merge';
  await saveBriefResponses(auditId, { ...existing, ...preBriefPatch }, { validation_perspective: 'client' });
  return 'merged';
}
