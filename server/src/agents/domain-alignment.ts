import type { z } from 'zod';

import type { DomainKey } from '@glc/intake-core';

import { BaseAgent, loadPrompt } from './base.js';
import type { BaseCollector } from '../collectors/base.js';
import { CLAUDE_COALITION_ALIGNMENT_TOOL_NAME } from '../config/agent-claude-contract.js';
import { MODEL_MAX_TOKENS } from '../config/model.js';
import {
  DomainAlignmentResponseSchema,
  type DomainAlignmentResponse,
} from '../schemas/director-collaboration/alignment.js';
import { persistDomainAlignmentResponse } from '../services/coalition/coalition-artifact-persistence.js';
import type { DomainResult } from '../types/audit.js';

/**
 * Scaffold agent for Collaborative Director Protocol Phase 2.
 * Concrete orchestration wiring provides per-domain execution ordering.
 */
export class DomainAlignmentAgent extends BaseAgent {
  private readonly targetDomain: DomainKey;

  constructor(auditId: string, domainKey: DomainKey) {
    super(auditId);
    this.targetDomain = domainKey;
  }

  get phaseNumber() { return 2.1; }
  get domainKey() { return this.targetDomain; }
  get collectors(): BaseCollector[] { return []; }
  get instructions() { return loadPrompt(`${this.targetDomain}-alignment`); }
  get outputSchema(): z.ZodSchema { return DomainAlignmentResponseSchema; }

  async execute(): Promise<DomainAlignmentResponse> {
    const context = await this.contextBuilder.build(
      this.auditId,
      2,
      this.targetDomain,
      {},
      this.instructions,
    );
    context.coalition_context_stage = 'alignment';
    context.coalition_alignment_responses = [];
    context.coalition_conflict_resolution = null;
    const alignment = await this.callClaudeWithRetry<DomainAlignmentResponse>(
      context,
      DomainAlignmentResponseSchema,
      MODEL_MAX_TOKENS.domain,
      CLAUDE_COALITION_ALIGNMENT_TOOL_NAME,
    );
    await persistDomainAlignmentResponse(alignment);
    return alignment;
  }

  override async run(): Promise<DomainResult> {
    await this.execute();
    return {
      score: 0,
      label: 'Coalition alignment',
      summary: `Alignment response persisted for ${this.targetDomain}.`,
      strengths: [],
      weaknesses: [],
      issues: [],
      quick_wins: [],
      recommendations: [],
      unknown_items: [],
    };
  }
}

