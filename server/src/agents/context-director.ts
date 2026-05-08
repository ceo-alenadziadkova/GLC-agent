import type { z } from 'zod';

import { BaseAgent, loadPrompt } from './base.js';
import type { BaseCollector } from '../collectors/base.js';
import { CLAUDE_COALITION_CONTEXT_DIRECTOR_TOOL_NAME } from '../config/agent-claude-contract.js';
import { MODEL_MAX_TOKENS } from '../config/model.js';
import {
  ClientSituationSnapshotSchema,
  type ClientSituationSnapshot,
} from '../schemas/director-collaboration/client-situation.js';
import { persistClientSituationSnapshot } from '../services/coalition/coalition-artifact-persistence.js';
import type { DomainResult } from '../types/audit.js';

/**
 * Scaffold agent for Collaborative Director Protocol Phase 0.5.
 *
 * Wiring into pipeline sequencing and persistence is intentionally deferred to
 * the coalition execution block. This class exists as the integration point
 * for prompt/schema/tool contract in Foundation.
 */
export class ContextDirectorAgent extends BaseAgent {
  get phaseNumber() { return 0.5; }
  get domainKey() { return 'recon' as const; }
  get collectors(): BaseCollector[] { return []; }
  get instructions() { return loadPrompt('context-director'); }
  get outputSchema(): z.ZodSchema { return ClientSituationSnapshotSchema; }

  async execute(): Promise<ClientSituationSnapshot> {
    const context = await this.contextBuilder.build(
      this.auditId,
      0,
      'recon',
      {},
      this.instructions,
    );
    context.coalition_context_stage = 'context_director';
    const snapshot = await this.callClaudeWithRetry<ClientSituationSnapshot>(
      context,
      ClientSituationSnapshotSchema,
      MODEL_MAX_TOKENS.recon,
      CLAUDE_COALITION_CONTEXT_DIRECTOR_TOOL_NAME,
    );
    await persistClientSituationSnapshot(snapshot);
    return snapshot;
  }

  override async run(): Promise<DomainResult> {
    await this.execute();
    return {
      score: 0,
      label: 'Coalition context director',
      summary: 'Client situation snapshot persisted for the Collaborative Director Protocol.',
      strengths: [],
      weaknesses: [],
      issues: [],
      quick_wins: [],
      recommendations: [],
      unknown_items: [],
    };
  }
}

