import { loadPrompt } from '../../agents/base.js';
import { MIN_TOKEN_RESERVE } from '../../config/model.js';
import {
  getOrchestrationConflictSynthesisRolloutPercent,
  isOrchestrationConflictSynthesisEnabled,
} from '../../config/feature-flags.js';
import { ORCHESTRATION_SYNTHESIS_CONFLICT_ID_PREFIX } from '../../config/orchestration-synthesis-policy.js';
import { ORCHESTRATION_TELEMETRY_METRICS } from '../../config/orchestration-telemetry-policy.js';
import { GlcOrchestrationPackSchema, type GlcOrchestrationPack } from '../../schemas/glc-orchestration-pack.js';
import type { GlcOrchestrationSynthesisToolOutput } from '../../schemas/glc-orchestration-synthesis-tool.js';
import type { RoadmapManifestPayload } from '../../schemas/roadmap-manifest.js';
import { logger } from '../logger.js';
import { TokenTracker } from '../token-tracker.js';
import { supabase } from '../supabase.js';
import { PIPELINE_EVENT_TYPES } from '../../config/pipeline-event-types.js';

import { buildOrchestrationSynthesisUserJson } from './orchestration-synthesis-context.js';
import { invokeOrchestrationPackSynthesisClaude } from './orchestration-pack-synthesis-claude.js';

function hashAuditIdToPercent(auditId: string): number {
  let hash = 0;
  for (let i = 0; i < auditId.length; i += 1) {
    hash = (hash * 31 + auditId.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
}

/**
 * Merges LLM synthesis rows into a deterministic pack. Deterministic `conflicts_resolved` ids win on collision.
 */
export function mergeOrchestrationSynthesisIntoPack(
  base: GlcOrchestrationPack,
  synthesis: GlcOrchestrationSynthesisToolOutput,
): GlcOrchestrationPack {
  const existingIds = new Set(base.conflicts_resolved.map((c) => c.id));
  const additions: GlcOrchestrationPack['conflicts_resolved'] = [];

  for (const row of synthesis.conflicts_resolved) {
    const id = row.id.startsWith(ORCHESTRATION_SYNTHESIS_CONFLICT_ID_PREFIX)
      ? row.id
      : `${ORCHESTRATION_SYNTHESIS_CONFLICT_ID_PREFIX}${row.id}`;
    if (existingIds.has(id)) {
      logger.warn('orchestration_synthesis.conflict_id_collision_skipped', { id });
      continue;
    }
    existingIds.add(id);
    additions.push({
      id,
      summary: row.summary,
      resolution: row.resolution,
    });
  }

  const merged: GlcOrchestrationPack = {
    ...base,
    conflicts_resolved: [...base.conflicts_resolved, ...additions],
  };
  const parsed = GlcOrchestrationPackSchema.parse(merged);
  if (
    parsed.graph.nodes.length !== base.graph.nodes.length ||
    parsed.graph.edges.length !== base.graph.edges.length ||
    parsed.critical_path.length !== base.critical_path.length
  ) {
    throw new Error('orchestration_synthesis invariant: synthesis must not alter graph topology');
  }
  return parsed;
}

/**
 * Optional LLM layer: single Claude call, TokenTracker, strict tool Zod. On failure returns the deterministic pack.
 * Does not call FactChecker and does not alter domain-phase CONTROL_OBJECT semantics.
 */
export async function runOrchestrationSynthesisIfEnabled(args: {
  auditId: string;
  deterministicPack: GlcOrchestrationPack;
  normalizedStrategy: Record<string, unknown>;
  domainRows: Array<Record<string, unknown>>;
  roadmapManifest?: RoadmapManifestPayload;
}): Promise<GlcOrchestrationPack> {
  const orchestrationPhase = -1;
  const startedAt = Date.now();
  await supabase.from('pipeline_events').insert({
    audit_id: args.auditId,
    phase: orchestrationPhase,
    event_type: PIPELINE_EVENT_TYPES.orchestrationStarted,
    message: 'Orchestration synthesis started',
    data: { detail_level: 'default', component: 'orchestration_synthesis' },
  });
  if (!isOrchestrationConflictSynthesisEnabled()) {
    await supabase.from('pipeline_events').insert({
      audit_id: args.auditId,
      phase: orchestrationPhase,
      event_type: PIPELINE_EVENT_TYPES.orchestrationCompleted,
      message: 'Orchestration synthesis skipped by feature flag',
      data: { detail_level: 'default', skipped: true, component: 'orchestration_synthesis' },
    });
    return args.deterministicPack;
  }
  const rolloutPercent = getOrchestrationConflictSynthesisRolloutPercent();
  const bucket = hashAuditIdToPercent(args.auditId);
  const inRollout = bucket < rolloutPercent;
  if (!inRollout) {
    logger.info('orchestration_synthesis.rollout_skip', {
      audit_id: args.auditId,
      rollout_percent: rolloutPercent,
      audit_bucket: bucket,
    });
    await supabase.from('pipeline_events').insert({
      audit_id: args.auditId,
      phase: orchestrationPhase,
      event_type: PIPELINE_EVENT_TYPES.orchestrationCompleted,
      message: 'Orchestration synthesis skipped by rollout segment',
      data: { detail_level: 'default', skipped: true, component: 'orchestration_synthesis' },
    });
    return args.deterministicPack;
  }

  const tokenTracker = new TokenTracker();
  const budget = await tokenTracker.checkBudget(args.auditId);
  if (!budget.within_budget || budget.remaining < MIN_TOKEN_RESERVE) {
    logger.warn('orchestration_synthesis.token_budget_skip', {
      audit_id: args.auditId,
      within_budget: budget.within_budget,
      remaining: budget.remaining,
      metric: ORCHESTRATION_TELEMETRY_METRICS.synthesisDeterministicFallback,
    });
    await supabase.from('pipeline_events').insert({
      audit_id: args.auditId,
      phase: orchestrationPhase,
      event_type: PIPELINE_EVENT_TYPES.orchestrationCompleted,
      message: 'Orchestration synthesis skipped by token budget',
      data: { detail_level: 'default', skipped: true, component: 'orchestration_synthesis' },
    });
    return args.deterministicPack;
  }

  const system = loadPrompt('orchestration-pack-synthesis');
  if (!system.trim()) {
    logger.error('orchestration_synthesis.missing_prompt', {
      audit_id: args.auditId,
      metric: ORCHESTRATION_TELEMETRY_METRICS.synthesisDeterministicFallback,
    });
    await supabase.from('pipeline_events').insert({
      audit_id: args.auditId,
      phase: orchestrationPhase,
      event_type: PIPELINE_EVENT_TYPES.orchestrationError,
      message: 'Orchestration synthesis failed: missing prompt',
      data: { detail_level: 'default', component: 'orchestration_synthesis' },
    });
    return args.deterministicPack;
  }

  const user = buildOrchestrationSynthesisUserJson({
    pack: args.deterministicPack,
    normalizedStrategy: args.normalizedStrategy,
    domainRows: args.domainRows,
    roadmapManifest: args.roadmapManifest,
  });

  try {
    const synthesis = await invokeOrchestrationPackSynthesisClaude({
      auditId: args.auditId,
      system,
      user,
    });
    logger.info('orchestration_synthesis.rollout_applied', {
      audit_id: args.auditId,
      rollout_percent: rolloutPercent,
      audit_bucket: bucket,
    });
    await supabase.from('pipeline_events').insert({
      audit_id: args.auditId,
      phase: orchestrationPhase,
      event_type: PIPELINE_EVENT_TYPES.orchestrationCompleted,
      message: 'Orchestration synthesis completed',
      data: {
        detail_level: 'default',
        component: 'orchestration_synthesis',
        latency_ms: Date.now() - startedAt,
        skipped: false,
      },
    });
    return mergeOrchestrationSynthesisIntoPack(args.deterministicPack, synthesis);
  } catch (err) {
    const error = err as Error;
    logger.warn('orchestration_synthesis.claude_skip', {
      audit_id: args.auditId,
      message: error.message,
      component: 'orchestration_synthesis',
      metric: ORCHESTRATION_TELEMETRY_METRICS.synthesisDeterministicFallback,
    });
    await supabase.from('pipeline_events').insert({
      audit_id: args.auditId,
      phase: orchestrationPhase,
      event_type: PIPELINE_EVENT_TYPES.orchestrationError,
      message: 'Orchestration synthesis failed',
      data: {
        detail_level: 'default',
        component: 'orchestration_synthesis',
        latency_ms: Date.now() - startedAt,
        error: error.message,
      },
    });
    return args.deterministicPack;
  }
}
