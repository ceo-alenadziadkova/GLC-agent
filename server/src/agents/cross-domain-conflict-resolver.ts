import type { z } from 'zod';

import { BaseAgent, loadPrompt } from './base.js';
import type { BaseCollector } from '../collectors/base.js';
import { CLAUDE_COALITION_CONFLICT_RESOLVER_TOOL_NAME } from '../config/agent-claude-contract.js';
import { MODEL_MAX_TOKENS } from '../config/model.js';
import {
  CrossDomainConflictResolutionSchema,
  type CrossDomainConflictResolution,
} from '../schemas/director-collaboration/conflict-resolution.js';
import { persistConflictResolution } from '../services/coalition/coalition-artifact-persistence.js';
import type { DomainResult } from '../types/audit.js';

/**
 * Scaffold agent for Collaborative Director Protocol Phase 3.
 *
 * Wiring into pipeline sequencing and persistence is intentionally deferred to
 * the coalition execution block. This class exists as the integration point
 * for prompt/schema/tool contract in Foundation.
 */
export class CrossDomainConflictResolverAgent extends BaseAgent {
  get phaseNumber() { return 3.1; }
  get domainKey() { return 'strategy' as const; }
  get collectors(): BaseCollector[] { return []; }
  get instructions() { return loadPrompt('cross-domain-conflict-resolver'); }
  get outputSchema(): z.ZodSchema { return CrossDomainConflictResolutionSchema; }

  async execute(): Promise<CrossDomainConflictResolution> {
    const context = await this.contextBuilder.build(
      this.auditId,
      7,
      'strategy',
      {},
      this.instructions,
    );
    context.coalition_context_stage = 'conflict_resolver';
    const resolution = await this.callClaudeWithRetry<CrossDomainConflictResolution>(
      context,
      CrossDomainConflictResolutionSchema,
      MODEL_MAX_TOKENS.strategy,
      CLAUDE_COALITION_CONFLICT_RESOLVER_TOOL_NAME,
    );
    await persistConflictResolution(resolution);
    return resolution;
  }

  override async run(): Promise<DomainResult> {
    await this.execute();
    return {
      score: 0,
      label: 'Coalition conflict resolver',
      summary: 'Cross-domain conflict resolution persisted for the Collaborative Director Protocol.',
      strengths: [],
      weaknesses: [],
      issues: [],
      quick_wins: [],
      recommendations: [],
      unknown_items: [],
    };
  }
}

