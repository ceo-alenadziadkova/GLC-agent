/**
 * Persists Director execution bundles for orchestration merge (read by `buildOrchestrationPackForAudit`).
 * Intentionally separate from FactChecker / CONTROL_OBJECT.
 * Invoked after each allowed domain Director run from `runPhaseDomainExecution` in `services/pipeline/phaseRunner.ts`
 * (extract → merge baseline/deep waves → write `audit_domains.raw_data.glc_director_execution`).
 */

import type { DomainKey } from '@glc/intake-core';

import {
  type DirectorOrchestrationPersistenceMode,
  GLC_DIRECTOR_EXECUTION_RAW_DATA_KEY,
  GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION,
} from '../../config/director-orchestration-policy.js';
import { fetchAuditByIdForUser } from '../../repositories/audits/audit-read-model.repository.js';
import {
  GlcDirectorOrchestrationSliceSchema,
  type GlcDirectorOrchestrationSlice,
} from '../../schemas/glc-director-orchestration-slice.js';
import { logger } from '../logger.js';
import { supabase } from '../supabase.js';

import { tryParseGlcDirectorOrchestrationSlice } from './extract-glc-director-slice-from-raw-data.js';

/** Merges incremental director writes (baseline run, then deep run) without dropping the other wave. */
export function mergeGlcDirectorOrchestrationSlices(
  existing: GlcDirectorOrchestrationSlice | null,
  incoming: GlcDirectorOrchestrationSlice,
): GlcDirectorOrchestrationSlice {
  return {
    schema_version: GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION,
    baseline: incoming.baseline !== undefined ? incoming.baseline : existing?.baseline,
    deep: incoming.deep !== undefined ? incoming.deep : existing?.deep,
  };
}

/**
 * Merges wave bundles into `audit_domains.raw_data.glc_director_execution` (preserves unspecified waves).
 */
export async function persistGlcDirectorOrchestrationSlice(args: {
  auditId: string;
  domainKey: DomainKey;
  userId: string;
  slice: GlcDirectorOrchestrationSlice;
}): Promise<{ error: Error | null }> {
  const parsed = GlcDirectorOrchestrationSliceSchema.safeParse(args.slice);
  if (!parsed.success) {
    return { error: new Error(`Invalid director orchestration slice: ${parsed.error.message}`) };
  }

  const { data: audit, error: auditErr } = await fetchAuditByIdForUser(args.auditId, args.userId);
  if (auditErr || !audit) {
    return { error: new Error('Audit not found or access denied') };
  }

  const { data: rows, error: readErr } = await supabase
    .from('audit_domains')
    .select('id, raw_data, version')
    .eq('audit_id', args.auditId)
    .eq('domain_key', args.domainKey)
    .order('version', { ascending: false })
    .limit(1);

  if (readErr) {
    return { error: new Error(readErr.message) };
  }
  const row = rows?.[0];
  if (!row?.id) {
    return { error: new Error('No audit_domains row for domain_key') };
  }

  const priorRaw =
    row.raw_data && typeof row.raw_data === 'object' && !Array.isArray(row.raw_data)
      ? { ...(row.raw_data as Record<string, unknown>) }
      : {};

  const existingSlice = tryParseGlcDirectorOrchestrationSlice(row.raw_data);
  const mergedSlice = mergeGlcDirectorOrchestrationSlices(existingSlice, parsed.data);
  const validated = GlcDirectorOrchestrationSliceSchema.safeParse(mergedSlice);
  if (!validated.success) {
    return { error: new Error(`Merged director slice invalid: ${validated.error.message}`) };
  }

  const nextRaw: Record<string, unknown> = {
    ...priorRaw,
    [GLC_DIRECTOR_EXECUTION_RAW_DATA_KEY]: validated.data,
  };

  const { error: writeErr } = await supabase.from('audit_domains').update({ raw_data: nextRaw }).eq('id', row.id);

  if (writeErr) {
    logger.error('director_orchestration.persist_failed', {
      auditId: args.auditId,
      domainKey: args.domainKey,
      message: writeErr.message,
    });
    return { error: new Error(writeErr.message) };
  }

  return { error: null };
}

/**
 * Internal pipeline helper: resolves owner user_id from audit row and persists
 * director orchestration slice without coupling phase runner to auth context.
 */
export async function persistGlcDirectorOrchestrationSliceForAuditOwner(args: {
  auditId: string;
  domainKey: DomainKey;
  slice: GlcDirectorOrchestrationSlice;
  mode?: DirectorOrchestrationPersistenceMode;
}): Promise<{ error: Error | null }> {
  const { data: auditRow, error: auditErr } = await supabase
    .from('audits')
    .select('user_id')
    .eq('id', args.auditId)
    .maybeSingle();

  if (auditErr || !auditRow?.user_id) {
    if (args.mode === 'best_effort') {
      logger.warn('director_orchestration.persist_skipped_missing_owner', {
        auditId: args.auditId,
        domainKey: args.domainKey,
        message: auditErr?.message ?? 'Audit owner not found',
      });
      return { error: null };
    }
    return { error: new Error(auditErr?.message ?? 'Audit owner not found') };
  }

  return persistGlcDirectorOrchestrationSlice({
    auditId: args.auditId,
    domainKey: args.domainKey,
    userId: auditRow.user_id,
    slice: args.slice,
  });
}
