import { loadPrompt } from '../../agents/base.js';
import { MIN_TOKEN_RESERVE } from '../../config/model.js';
import { isOrchestrationConflictSynthesisEnabled } from '../../config/feature-flags.js';
import { ORCHESTRATION_SYNTHESIS_CONFLICT_ID_PREFIX } from '../../config/orchestration-synthesis-policy.js';
import { GlcOrchestrationPackSchema, type GlcOrchestrationPack } from '../../schemas/glc-orchestration-pack.js';
import type { GlcOrchestrationSynthesisToolOutput } from '../../schemas/glc-orchestration-synthesis-tool.js';
import { logger } from '../logger.js';
import { TokenTracker } from '../token-tracker.js';

import { buildOrchestrationSynthesisUserJson } from './orchestration-synthesis-context.js';
import { invokeOrchestrationPackSynthesisClaude } from './orchestration-pack-synthesis-claude.js';

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
  return GlcOrchestrationPackSchema.parse(merged);
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
}): Promise<GlcOrchestrationPack> {
  if (!isOrchestrationConflictSynthesisEnabled()) {
    return args.deterministicPack;
  }

  const tokenTracker = new TokenTracker();
  const budget = await tokenTracker.checkBudget(args.auditId);
  if (!budget.within_budget || budget.remaining < MIN_TOKEN_RESERVE) {
    logger.warn('orchestration_synthesis.token_budget_skip', {
      audit_id: args.auditId,
      within_budget: budget.within_budget,
      remaining: budget.remaining,
    });
    return args.deterministicPack;
  }

  const system = loadPrompt('orchestration-pack-synthesis');
  if (!system.trim()) {
    logger.error('orchestration_synthesis.missing_prompt', { audit_id: args.auditId });
    return args.deterministicPack;
  }

  const user = buildOrchestrationSynthesisUserJson({
    pack: args.deterministicPack,
    normalizedStrategy: args.normalizedStrategy,
    domainRows: args.domainRows,
  });

  try {
    const synthesis = await invokeOrchestrationPackSynthesisClaude({
      auditId: args.auditId,
      system,
      user,
    });
    return mergeOrchestrationSynthesisIntoPack(args.deterministicPack, synthesis);
  } catch (err) {
    const error = err as Error;
    logger.warn('orchestration_synthesis.claude_skip', {
      audit_id: args.auditId,
      message: error.message,
    });
    return args.deterministicPack;
  }
}
