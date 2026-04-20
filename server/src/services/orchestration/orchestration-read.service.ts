/**
 * GLC Orchestrator read path: loads audit strategy + coverage + manifest, builds persisted pack shape.
 *
 * Boundaries (phase 0):
 * - Does not call FactChecker or build per-domain CONTROL_OBJECT.
 * - Does not replace StrategyAgent; consumes already-persisted initiatives.
 */

import { GlcOrchestrationPackSchema, type GlcOrchestrationPack } from '../../schemas/glc-orchestration-pack.js';
import {
  ORCHESTRATION_PACK_PERSIST_MAX_RETRIES,
  ORCHESTRATION_PACK_REVISION_HISTORY_MAX_ITEMS,
} from '../../config/orchestration-graph-policy.js';
import {
  GlcOrchestrationPackRevisionDiffSchema,
  type GlcOrchestrationPackRevisionDiff,
} from '../../schemas/orchestration-pack-revision-diff.js';
import { z } from 'zod';
import type { DomainKey } from '@glc/intake-core';
import type { AuditExecutionPlan, ProductMode } from '../../types/audit.js';
import { normalizeExecutionPlan } from '../execution-plan.js';
import { fetchAuditByIdForUser, fetchAuditRelatedReadModel } from '../../repositories/audits/audit-read-model.repository.js';
import { logger } from '../logger.js';
import {
  flattenNormalizedStrategyInitiativeBuckets,
  normalizeAuditStrategyRowForReadModel,
} from '../strategy/strategy-audit-read-normalize.js';
import { supabase } from '../supabase.js';
import { buildGlcOrchestrationPackFromActionNodes } from './build-glc-orchestration-pack.js';
import {
  buildDirectorSliceIndexFromDomainRows,
  buildDirectorSliceParseStatusIndexFromDomainRows,
} from './extract-glc-director-slice-from-raw-data.js';
import { collectOrchestrationActionInputs } from './orchestration-action-sources.js';
import { runOrchestrationSynthesisIfEnabled } from './orchestration-synthesis.service.js';
import {
  assertManifestMatchesExecutionPlan,
  fetchLatestRoadmapManifestSnapshotIdForAudit,
  fetchRoadmapManifestSnapshotForAudit,
} from './roadmap-manifest.service.js';
import { buildOrchestrationPackRevisionDiff } from './orchestration-pack-diff.js';
import type { RoadmapManifestPayload } from '../../schemas/roadmap-manifest.js';

export async function loadAuditExecutionPlanRow(
  auditId: string,
  userId: string,
): Promise<{ plan: AuditExecutionPlan } | null> {
  const { data: audit, error } = await fetchAuditByIdForUser(auditId, userId);
  if (error || !audit) return null;
  const rawPlan = (audit as { execution_plan?: unknown }).execution_plan;
  const plan = normalizeExecutionPlan(
    rawPlan && typeof rawPlan === 'object' ? (rawPlan as Partial<AuditExecutionPlan>) : null,
    (audit as { product_mode?: ProductMode }).product_mode ?? undefined,
  );
  return { plan };
}

export async function buildOrchestrationPackForAudit(args: {
  auditId: string;
  userId: string;
  manifestSnapshotId: string;
}): Promise<GlcOrchestrationPack | null> {
  const result = await buildOrchestrationPackForAuditWithStatus(args);
  return result.status === 'ok' ? result.pack : null;
}

export type OrchestrationPackBuildNotReadyReasonCode =
  | 'audit_not_found'
  | 'manifest_snapshot_missing'
  | 'manifest_snapshot_not_latest'
  | 'strategy_row_missing'
  | 'strategy_normalization_failed'
  | 'no_action_nodes';

export type BuildOrchestrationPackForAuditResult =
  | { status: 'ok'; pack: GlcOrchestrationPack }
  | { status: 'not_ready'; reason_code: OrchestrationPackBuildNotReadyReasonCode };

type LoadedOrchestrationInputs =
  | { status: 'ok'; auditPlan: AuditExecutionPlan; manifestRow: { id: string; payload: RoadmapManifestPayload } }
  | { status: 'not_ready'; reason_code: 'audit_not_found' | 'manifest_snapshot_missing' | 'manifest_snapshot_not_latest' };

type NormalizedActionInputs =
  | {
      status: 'ok';
      nodes: ReturnType<typeof collectOrchestrationActionInputs>['combined_nodes'];
      preGraphConflicts: ReturnType<typeof collectOrchestrationActionInputs>['strategy']['conflicts_resolved'];
      mergedConflicts: ReturnType<typeof collectOrchestrationActionInputs>['director']['conflicts_resolved'];
      inputQuality: ReturnType<typeof collectOrchestrationActionInputs>['director']['input_quality'];
      normalizedStrategy: NonNullable<ReturnType<typeof normalizeAuditStrategyRowForReadModel>>;
      domainRowsForSynth: Array<Record<string, unknown>>;
    }
  | {
      status: 'not_ready';
      reason_code: 'strategy_row_missing' | 'strategy_normalization_failed' | 'no_action_nodes';
    };

async function loadOrchestrationInputs(args: {
  auditId: string;
  userId: string;
  manifestSnapshotId: string;
}): Promise<LoadedOrchestrationInputs> {
  const auditCtx = await loadAuditExecutionPlanRow(args.auditId, args.userId);
  if (!auditCtx) return { status: 'not_ready', reason_code: 'audit_not_found' };

  const manifestRow = await fetchRoadmapManifestSnapshotForAudit({
    auditId: args.auditId,
    snapshotId: args.manifestSnapshotId,
  });
  if (!manifestRow) return { status: 'not_ready', reason_code: 'manifest_snapshot_missing' };

  const latestManifest = await fetchLatestRoadmapManifestSnapshotIdForAudit({
    auditId: args.auditId,
  });
  if (!latestManifest || latestManifest.id !== manifestRow.id) {
    return { status: 'not_ready', reason_code: 'manifest_snapshot_not_latest' };
  }

  assertManifestMatchesExecutionPlan(manifestRow.payload, auditCtx.plan);
  return { status: 'ok', auditPlan: auditCtx.plan, manifestRow };
}

async function normalizeOrchestrationActionInputs(args: {
  auditId: string;
  selectedDomains: readonly DomainKey[];
}): Promise<NormalizedActionInputs> {
  const [_reconRes, domainsRes, strategyRes, _reviewsRes, briefRes] = await fetchAuditRelatedReadModel(args.auditId);
  const domainsArr = domainsRes.status === 'fulfilled' ? (domainsRes.value.data ?? []) : [];
  const strategyRow = strategyRes.status === 'fulfilled' ? strategyRes.value.data : null;
  const brief = briefRes.status === 'fulfilled' ? (briefRes.value.data ?? null) : null;

  if (!strategyRow || typeof strategyRow !== 'object') {
    return { status: 'not_ready', reason_code: 'strategy_row_missing' };
  }

  const domainsMap: Record<string, unknown> = {};
  for (const domainRow of domainsArr) {
    const existing = domainsMap[domainRow.domain_key] as { version?: number } | undefined;
    if (!existing || domainRow.version > (existing.version ?? 0)) {
      domainsMap[domainRow.domain_key] = domainRow;
    }
  }
  const domainRowsDeduped = Object.values(domainsMap) as Array<{ domain_key: string; issues?: unknown; raw_data?: unknown }>;
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
  if (!normalized) return { status: 'not_ready', reason_code: 'strategy_normalization_failed' };

  const initiatives = flattenNormalizedStrategyInitiativeBuckets(normalized);
  const sliceIndex = buildDirectorSliceIndexFromDomainRows(
    domainRowsDeduped as Array<{ domain_key: string; raw_data?: unknown }>,
  );
  const sliceInputStatusIndex = buildDirectorSliceParseStatusIndexFromDomainRows(
    domainRowsDeduped as Array<{ domain_key: string; raw_data?: unknown }>,
  );
  const sourced = collectOrchestrationActionInputs({
    initiatives,
    selectedDomains: args.selectedDomains,
    directorSlicesByDomain: sliceIndex,
    directorInputStatusByDomain: sliceInputStatusIndex,
  });
  if (sourced.combined_nodes.length === 0) return { status: 'not_ready', reason_code: 'no_action_nodes' };

  return {
    status: 'ok',
    nodes: sourced.combined_nodes,
    preGraphConflicts: sourced.strategy.conflicts_resolved,
    mergedConflicts: sourced.director.conflicts_resolved,
    inputQuality: sourced.director.input_quality,
    normalizedStrategy: normalized,
    domainRowsForSynth: domainRowsDeduped as Array<Record<string, unknown>>,
  };
}

export async function buildOrchestrationPackForAuditWithStatus(args: {
  auditId: string;
  userId: string;
  manifestSnapshotId: string;
}): Promise<BuildOrchestrationPackForAuditResult> {
  const startedAt = Date.now();
  const priorPersisted = await fetchPersistedGlcOrchestrationPackForUser({
    auditId: args.auditId,
    userId: args.userId,
  });
  const priorVersion =
    priorPersisted.status === 'ok' ? priorPersisted.orchestration_pack_version : 0;
  const emitBuildMetric = (
    status: 'success' | 'not_ready' | 'failed',
    reason: OrchestrationPackBuildNotReadyReasonCode | 'pack_built',
    nodeCount = 0,
  ) => {
    logger.info('orchestration.pack_build_metric', {
      auditId: args.auditId,
      metric: 'orchestration_pack_build',
      status,
      reason,
      duration_ms: Date.now() - startedAt,
      node_count: nodeCount,
      kpi_pack_regeneration: priorVersion > 0 ? 1 : 0,
    });
  };

  const loaded = await loadOrchestrationInputs(args);
  if (loaded.status === 'not_ready') {
    emitBuildMetric('not_ready', loaded.reason_code);
    return loaded;
  }

  const normalizedInputs = await normalizeOrchestrationActionInputs({
    auditId: args.auditId,
    selectedDomains: loaded.auditPlan.selected_domains,
  });
  if (normalizedInputs.status === 'not_ready') {
    emitBuildMetric('not_ready', normalizedInputs.reason_code);
    return normalizedInputs;
  }

  const deterministicPack = buildGlcOrchestrationPackFromActionNodes({
    nodes: normalizedInputs.nodes,
    preGraphConflicts: [...normalizedInputs.preGraphConflicts, ...normalizedInputs.mergedConflicts],
    manifestSnapshotId: loaded.manifestRow.id,
    seasonPreset: loaded.manifestRow.payload.season_preset,
    inputQuality: normalizedInputs.inputQuality,
  });

  const result = await runOrchestrationSynthesisIfEnabled({
    auditId: args.auditId,
    deterministicPack,
    normalizedStrategy: normalizedInputs.normalizedStrategy,
    domainRows: normalizedInputs.domainRowsForSynth,
    roadmapManifest: loaded.manifestRow.payload,
  });
  logger.info('orchestration.pack_lifecycle_metric', {
    auditId: args.auditId,
    metric: 'orchestration_pack_lifecycle',
    kpi_manifest_adoption: 1,
    kpi_pack_regeneration: priorVersion > 0 ? 1 : 0,
    kpi_synthesis_override_rate:
      deterministicPack.conflicts_resolved.length === 0
        ? 0
        : Number(
            (
              Math.max(
                0,
                deterministicPack.conflicts_resolved.length - result.conflicts_resolved.length,
              ) / deterministicPack.conflicts_resolved.length
            ).toFixed(4),
          ),
    kpi_unresolved_conflicts_rate:
      result.conflicts_resolved.length === 0
        ? 0
        : Number(
            (
              result.conflicts_resolved.filter(row => row.resolution === 'synthesis_pending').length /
              result.conflicts_resolved.length
            ).toFixed(4),
          ),
    manifest_snapshot_id: loaded.manifestRow.id,
    execution_mode: result.execution_mode,
    director_coverage_ratio: normalizedInputs.inputQuality.director_coverage_ratio,
    director_input_coverage_ratio: normalizedInputs.inputQuality.director_input_coverage_ratio,
    input_fallback_reason_code: normalizedInputs.inputQuality.fallback_reason_code,
  });
  emitBuildMetric('success', 'pack_built', result.graph.nodes.length);
  return { status: 'ok', pack: result };
}

export type FetchPersistedOrchestrationPackResult =
  | { status: 'not_found' }
  | { status: 'error'; error: Error }
  | {
      status: 'ok';
      pack: GlcOrchestrationPack | null;
      orchestration_pack_version: number;
      last_revision_diff: GlcOrchestrationPackRevisionDiff | null;
      revision_history: OrchestrationPackRevisionHistoryItem[];
    };

export type OrchestrationPackRevisionHistoryItem = {
  from_version: number;
  to_version: number;
  diff: GlcOrchestrationPackRevisionDiff;
};

const OrchestrationPackRevisionHistoryItemSchema = z.object({
  from_version: z.number().int().nonnegative(),
  to_version: z.number().int().positive(),
  diff: GlcOrchestrationPackRevisionDiffSchema,
});

const OrchestrationPackRevisionHistorySchema = z.array(OrchestrationPackRevisionHistoryItemSchema);

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
    .select(
      'glc_orchestration_pack, orchestration_pack_version, glc_orchestration_last_revision_diff, glc_orchestration_revision_history',
    )
    .eq('audit_id', args.auditId)
    .maybeSingle();

  if (readErr) {
    return { status: 'error', error: new Error(readErr.message) };
  }

  const version =
    typeof row?.orchestration_pack_version === 'number' && Number.isFinite(row.orchestration_pack_version)
      ? row.orchestration_pack_version
      : 0;

  const rawDiff = row?.glc_orchestration_last_revision_diff;
  const parsedDiff = GlcOrchestrationPackRevisionDiffSchema.safeParse(rawDiff);
  const last_revision_diff = parsedDiff.success ? parsedDiff.data : null;
  const rawHistory = row?.glc_orchestration_revision_history;
  const parsedHistory = OrchestrationPackRevisionHistorySchema.safeParse(rawHistory);
  const revision_history = parsedHistory.success ? parsedHistory.data : [];

  const rawPack = row?.glc_orchestration_pack;
  if (rawPack === null || rawPack === undefined) {
    return { status: 'ok', pack: null, orchestration_pack_version: version, last_revision_diff, revision_history };
  }

  const parsed = GlcOrchestrationPackSchema.safeParse(rawPack);
  if (!parsed.success) {
    logger.warn('orchestration.persisted_pack_parse_failed', {
      auditId: args.auditId,
      issues: parsed.error.flatten(),
    });
    return { status: 'ok', pack: null, orchestration_pack_version: version, last_revision_diff, revision_history };
  }

  return { status: 'ok', pack: parsed.data, orchestration_pack_version: version, last_revision_diff, revision_history };
}

export async function fetchOrchestrationPackRevisionHistoryForUser(args: {
  auditId: string;
  userId: string;
  limit: number;
}): Promise<
  | { status: 'not_found' }
  | { status: 'error'; error: Error }
  | { status: 'ok'; items: OrchestrationPackRevisionHistoryItem[] }
> {
  const persisted = await fetchPersistedGlcOrchestrationPackForUser({
    auditId: args.auditId,
    userId: args.userId,
  });
  if (persisted.status !== 'ok') return persisted;
  const items = [...persisted.revision_history];
  if (items.length === 0 && persisted.last_revision_diff) {
    items.push({
      from_version: persisted.last_revision_diff.from_version,
      to_version: persisted.last_revision_diff.to_version,
      diff: persisted.last_revision_diff,
    });
  }
  items.sort((a, b) => b.to_version - a.to_version);
  return { status: 'ok', items: items.slice(0, args.limit) };
}

function appendRevisionHistory(
  priorHistory: OrchestrationPackRevisionHistoryItem[],
  nextDiff: GlcOrchestrationPackRevisionDiff | null,
): OrchestrationPackRevisionHistoryItem[] {
  if (!nextDiff) return priorHistory.slice(0, ORCHESTRATION_PACK_REVISION_HISTORY_MAX_ITEMS);
  const nextItem: OrchestrationPackRevisionHistoryItem = {
    from_version: nextDiff.from_version,
    to_version: nextDiff.to_version,
    diff: nextDiff,
  };
  const merged = [nextItem, ...priorHistory.filter(row => row.to_version !== nextItem.to_version)];
  return merged.slice(0, ORCHESTRATION_PACK_REVISION_HISTORY_MAX_ITEMS);
}

export async function persistGlcOrchestrationPack(args: {
  auditId: string;
  userId: string;
  pack: GlcOrchestrationPack;
}): Promise<{
  orchestration_pack_version: number;
  last_revision_diff: GlcOrchestrationPackRevisionDiff | null;
  error: Error | null;
}> {
  const { data: audit, error: auditErr } = await fetchAuditByIdForUser(args.auditId, args.userId);
  if (auditErr || !audit) {
    return {
      orchestration_pack_version: 0,
      last_revision_diff: null,
      error: new Error('Audit not found or access denied'),
    };
  }

  for (let attempt = 0; attempt <= ORCHESTRATION_PACK_PERSIST_MAX_RETRIES; attempt += 1) {
    const { data: row, error: readErr } = await supabase
      .from('audit_strategy')
      .select('orchestration_pack_version, glc_orchestration_pack, glc_orchestration_revision_history')
      .eq('audit_id', args.auditId)
      .maybeSingle();

    if (readErr) {
      return { orchestration_pack_version: 0, last_revision_diff: null, error: new Error(readErr.message) };
    }
    if (!row) {
      return {
        orchestration_pack_version: 0,
        last_revision_diff: null,
        error: new Error('audit_strategy row missing for audit'),
      };
    }

    const priorVersion =
      typeof row.orchestration_pack_version === 'number' && Number.isFinite(row.orchestration_pack_version)
        ? row.orchestration_pack_version
        : 0;
    const nextVersion = priorVersion + 1;

    let last_revision_diff: GlcOrchestrationPackRevisionDiff | null = null;
    const parsedHistory = OrchestrationPackRevisionHistorySchema.safeParse(row.glc_orchestration_revision_history);
    const priorHistory = parsedHistory.success ? parsedHistory.data : [];
    if (priorVersion > 0) {
      const priorParsed = GlcOrchestrationPackSchema.safeParse(row.glc_orchestration_pack);
      if (priorParsed.success) {
        last_revision_diff = buildOrchestrationPackRevisionDiff({
          previous: priorParsed.data,
          next: args.pack,
          fromVersion: priorVersion,
          toVersion: nextVersion,
        });
      }
    }
    const revisionHistory = appendRevisionHistory(priorHistory, last_revision_diff);

    const { data: updatedRows, error: writeErr } = await supabase
      .from('audit_strategy')
      .update({
        glc_orchestration_pack: args.pack as unknown as Record<string, unknown>,
        orchestration_pack_version: nextVersion,
        glc_orchestration_last_revision_diff: last_revision_diff as unknown as Record<string, unknown> | null,
        glc_orchestration_revision_history: revisionHistory as unknown as Record<string, unknown>[],
      })
      .eq('audit_id', args.auditId)
      .eq('orchestration_pack_version', priorVersion)
      .select('audit_id');

    if (writeErr) {
      return {
        orchestration_pack_version: priorVersion,
        last_revision_diff: null,
        error: new Error(writeErr.message),
      };
    }
    if (updatedRows && updatedRows.length > 0) {
      return { orchestration_pack_version: nextVersion, last_revision_diff, error: null };
    }
    if (attempt >= ORCHESTRATION_PACK_PERSIST_MAX_RETRIES) {
      return {
        orchestration_pack_version: priorVersion,
        last_revision_diff: null,
        error: new Error('audit_strategy optimistic update retry budget exhausted'),
      };
    }
  }

  return {
    orchestration_pack_version: 0,
    last_revision_diff: null,
    error: new Error('audit_strategy optimistic update failed'),
  };
}

export async function updateAuditExecutionPlanSelectedDomainsForUser(args: {
  auditId: string;
  userId: string;
  selectedDomains: AuditExecutionPlan['selected_domains'];
}): Promise<{ plan: AuditExecutionPlan | null; error: Error | null }> {
  const loaded = await loadAuditExecutionPlanRow(args.auditId, args.userId);
  if (!loaded) {
    return { plan: null, error: new Error('Audit not found or access denied') };
  }
  const nextPlan = normalizeExecutionPlan(
    {
      ...loaded.plan,
      selected_domains: [...args.selectedDomains],
    },
    undefined,
  );
  const { error } = await supabase
    .from('audits')
    .update({
      execution_plan: nextPlan as unknown as Record<string, unknown>,
    })
    .eq('id', args.auditId)
    .eq('user_id', args.userId);
  if (error) {
    return { plan: null, error: new Error(error.message) };
  }
  return { plan: nextPlan, error: null };
}
