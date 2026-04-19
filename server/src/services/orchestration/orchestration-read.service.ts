/**
 * GLC Orchestrator read path: loads audit strategy + coverage + manifest, builds persisted pack shape.
 *
 * Boundaries (phase 0):
 * - Does not call FactChecker or build per-domain CONTROL_OBJECT.
 * - Does not replace StrategyAgent; consumes already-persisted initiatives.
 */

import { GlcOrchestrationPackSchema, type GlcOrchestrationPack } from '../../schemas/glc-orchestration-pack.js';
import type { AuditExecutionPlan } from '../../types/audit.js';
import { normalizeExecutionPlan } from '../execution-plan.js';
import { fetchAuditByIdForUser, fetchAuditRelatedReadModel } from '../../repositories/audits/audit-read-model.repository.js';
import { logger } from '../logger.js';
import {
  flattenNormalizedStrategyInitiativeBuckets,
  normalizeAuditStrategyRowForReadModel,
} from '../strategy/strategy-audit-read-normalize.js';
import { supabase } from '../supabase.js';
import { buildGlcOrchestrationPackFromInitiatives } from './build-glc-orchestration-pack.js';
import { runOrchestrationSynthesisIfEnabled } from './orchestration-synthesis.service.js';
import {
  assertManifestMatchesExecutionPlan,
  fetchRoadmapManifestSnapshotForAudit,
} from './roadmap-manifest.service.js';

export async function loadAuditExecutionPlanRow(
  auditId: string,
  userId: string,
): Promise<{ plan: AuditExecutionPlan } | null> {
  const { data: audit, error } = await fetchAuditByIdForUser(auditId, userId);
  if (error || !audit) return null;
  const rawPlan = (audit as { execution_plan?: unknown }).execution_plan;
  const plan = normalizeExecutionPlan(
    rawPlan && typeof rawPlan === 'object' ? (rawPlan as Partial<AuditExecutionPlan>) : null,
    (audit as { product_mode?: string }).product_mode ?? undefined,
  );
  return { plan };
}

export async function buildOrchestrationPackForAudit(args: {
  auditId: string;
  userId: string;
  manifestSnapshotId: string;
}): Promise<GlcOrchestrationPack | null> {
  const auditCtx = await loadAuditExecutionPlanRow(args.auditId, args.userId);
  if (!auditCtx) return null;

  const manifestRow = await fetchRoadmapManifestSnapshotForAudit({
    auditId: args.auditId,
    snapshotId: args.manifestSnapshotId,
  });
  if (!manifestRow) return null;

  assertManifestMatchesExecutionPlan(manifestRow.payload, auditCtx.plan);

  const [_reconRes, domainsRes, strategyRes, _reviewsRes, briefRes] = await fetchAuditRelatedReadModel(
    args.auditId,
  );
  const domainsArr =
    domainsRes.status === 'fulfilled' ? (domainsRes.value.data ?? []) : [];
  const strategyRow =
    strategyRes.status === 'fulfilled' ? strategyRes.value.data : null;
  const brief = briefRes.status === 'fulfilled' ? (briefRes.value.data ?? null) : null;

  if (!strategyRow || typeof strategyRow !== 'object') return null;

  const domainsMap: Record<string, unknown> = {};
  for (const domainRow of domainsArr) {
    const existing = domainsMap[domainRow.domain_key] as { version?: number } | undefined;
    if (!existing || domainRow.version > (existing.version ?? 0)) {
      domainsMap[domainRow.domain_key] = domainRow;
    }
  }
  const domainRowsDeduped = Object.values(domainsMap) as Array<{ domain_key: string; issues?: unknown }>;

  const briefResponses =
    brief && typeof brief === 'object' && brief !== null && 'responses' in brief
      ? (brief as { responses?: unknown }).responses
      : undefined;

  const normalized = normalizeAuditStrategyRowForReadModel({
    strategy: strategyRow as Record<string, unknown>,
    domainRows: domainRowsDeduped,
    briefResponses:
      briefResponses && typeof briefResponses === 'object' && !Array.isArray(briefResponses)
        ? (briefResponses as Record<string, unknown>)
        : null,
  });
  if (!normalized) return null;

  const initiatives = flattenNormalizedStrategyInitiativeBuckets(normalized);
  if (initiatives.length === 0) return null;

  const deterministicPack = buildGlcOrchestrationPackFromInitiatives({
    initiatives,
    manifestSnapshotId: manifestRow.id,
  });

  const domainRowsForSynth = domainRowsDeduped as Array<Record<string, unknown>>;

  return runOrchestrationSynthesisIfEnabled({
    auditId: args.auditId,
    deterministicPack,
    normalizedStrategy: normalized,
    domainRows: domainRowsForSynth,
  });
}

export type FetchPersistedOrchestrationPackResult =
  | { status: 'not_found' }
  | { status: 'error'; error: Error }
  | { status: 'ok'; pack: GlcOrchestrationPack | null; orchestration_pack_version: number };

/**
 * Latest persisted orchestration pack for an audit (requires audit access).
 */
export async function fetchPersistedGlcOrchestrationPackForUser(args: {
  auditId: string;
  userId: string;
}): Promise<FetchPersistedOrchestrationPackResult> {
  const { data: audit, error: auditErr } = await fetchAuditByIdForUser(args.auditId, args.userId);
  if (auditErr || !audit) {
    return { status: 'not_found' };
  }

  const { data: row, error: readErr } = await supabase
    .from('audit_strategy')
    .select('glc_orchestration_pack, orchestration_pack_version')
    .eq('audit_id', args.auditId)
    .maybeSingle();

  if (readErr) {
    return { status: 'error', error: new Error(readErr.message) };
  }

  const version =
    typeof row?.orchestration_pack_version === 'number' && Number.isFinite(row.orchestration_pack_version)
      ? row.orchestration_pack_version
      : 0;

  const rawPack = row?.glc_orchestration_pack;
  if (rawPack === null || rawPack === undefined) {
    return { status: 'ok', pack: null, orchestration_pack_version: version };
  }

  const parsed = GlcOrchestrationPackSchema.safeParse(rawPack);
  if (!parsed.success) {
    logger.warn('orchestration.persisted_pack_parse_failed', {
      auditId: args.auditId,
      issues: parsed.error.flatten(),
    });
    return { status: 'ok', pack: null, orchestration_pack_version: version };
  }

  return { status: 'ok', pack: parsed.data, orchestration_pack_version: version };
}

export async function persistGlcOrchestrationPack(args: {
  auditId: string;
  userId: string;
  pack: GlcOrchestrationPack;
}): Promise<{ orchestration_pack_version: number; error: Error | null }> {
  const { data: audit, error: auditErr } = await fetchAuditByIdForUser(args.auditId, args.userId);
  if (auditErr || !audit) {
    return { orchestration_pack_version: 0, error: new Error('Audit not found or access denied') };
  }

  const { data: row, error: readErr } = await supabase
    .from('audit_strategy')
    .select('orchestration_pack_version')
    .eq('audit_id', args.auditId)
    .maybeSingle();

  if (readErr) return { orchestration_pack_version: 0, error: new Error(readErr.message) };

  if (!row) {
    return {
      orchestration_pack_version: 0,
      error: new Error('audit_strategy row missing for audit'),
    };
  }

  const priorVersion =
    typeof row.orchestration_pack_version === 'number' && Number.isFinite(row.orchestration_pack_version)
      ? row.orchestration_pack_version
      : 0;

  const nextVersion =
    typeof row.orchestration_pack_version === 'number' && Number.isFinite(row.orchestration_pack_version)
      ? row.orchestration_pack_version + 1
      : 1;

  const { data: updatedRows, error: writeErr } = await supabase
    .from('audit_strategy')
    .update({
      glc_orchestration_pack: args.pack as unknown as Record<string, unknown>,
      orchestration_pack_version: nextVersion,
    })
    .eq('audit_id', args.auditId)
    .select('audit_id');

  if (writeErr) {
    return { orchestration_pack_version: priorVersion, error: new Error(writeErr.message) };
  }
  if (!updatedRows || updatedRows.length === 0) {
    return {
      orchestration_pack_version: priorVersion,
      error: new Error('audit_strategy update affected no rows'),
    };
  }

  return { orchestration_pack_version: nextVersion, error: null };
}
