import type { z } from 'zod';

import type { DomainKey } from '@glc/intake-core';

import { BaseAgent, loadPrompt } from './base.js';
import type { BaseCollector } from '../collectors/base.js';
import { CLAUDE_COALITION_HYPOTHESIS_TOOL_NAME } from '../config/agent-claude-contract.js';
import { MODEL_MAX_TOKENS } from '../config/model.js';
import {
  DomainHypothesisDraftSchema,
  type DomainHypothesisDraft,
} from '../schemas/director-collaboration/hypothesis.js';
import { persistDomainHypothesisDraft } from '../services/coalition/coalition-artifact-persistence.js';
import type { DomainResult } from '../types/audit.js';

/**
 * Scaffold agent for Collaborative Director Protocol Phase 1.
 * Concrete orchestration wiring provides per-domain execution ordering.
 */
export class DomainHypothesisAgent extends BaseAgent {
  private readonly targetDomain: DomainKey;

  constructor(auditId: string, domainKey: DomainKey) {
    super(auditId);
    this.targetDomain = domainKey;
  }

  get phaseNumber() { return 1.1; }
  get domainKey() { return this.targetDomain; }
  get collectors(): BaseCollector[] { return []; }
  get instructions() { return loadPrompt(`${this.targetDomain}-hypothesis`); }
  get outputSchema(): z.ZodSchema { return DomainHypothesisDraftSchema; }

  async execute(): Promise<DomainHypothesisDraft> {
    const context = await this.contextBuilder.build(
      this.auditId,
      1,
      this.targetDomain,
      {},
      this.instructions,
    );
    context.coalition_context_stage = 'hypothesis';
    context.coalition_hypothesis_drafts = [];
    context.coalition_alignment_responses = [];
    context.coalition_conflict_resolution = null;
    const draft = await this.callClaudeWithRetry<DomainHypothesisDraft>(
      context,
      DomainHypothesisDraftSchema,
      MODEL_MAX_TOKENS.domain,
      CLAUDE_COALITION_HYPOTHESIS_TOOL_NAME,
    );
    await persistDomainHypothesisDraft(draft);
    return draft;
  }

  override async run(): Promise<DomainResult> {
    await this.execute();
    return {
      score: 0,
      label: 'Coalition hypothesis',
      summary: `Hypothesis draft persisted for ${this.targetDomain}.`,
      strengths: [],
      weaknesses: [],
      issues: [],
      quick_wins: [],
      recommendations: [],
      unknown_items: [],
    };
  }
}

