import { z } from 'zod';
import type { BaseCollector } from '../collectors/base.js';
import { BaseAgent } from './base.js';

/**
 * Base class for director sub-agents used in on-demand deep-dive flows.
 * It keeps a narrow, explicit contract and reuses BaseAgent runtime hooks.
 */
export abstract class DirectorSubAgentBase extends BaseAgent {
  abstract readonly id: string;
  abstract readonly directorDomain: string;
  abstract readonly promptRef: string;
  abstract readonly outputSchema: z.ZodSchema;
  abstract buildInstructions(context: string, mode: string): string;

  get phaseNumber(): number {
    return 99;
  }

  get domainKey(): 'strategy' {
    return 'strategy';
  }

  get collectors(): BaseCollector[] {
    return [];
  }

  get instructions(): string {
    return this.buildInstructions('', 'growth');
  }

  /**
   * Runs a sub-agent as an on-demand deep-dive pass with its dedicated schema.
   * Reuses BaseAgent token budget checks and Claude retry behavior.
   */
  async runSubAgent(args: { context: string; mode: string; maxTokens: number }): Promise<unknown> {
    const builtContext = await this.contextBuilder.build(
      this.auditId,
      this.domainKey,
      {},
      this.buildInstructions(args.context, args.mode),
    );
    const result = await this.callClaudeWithRetry(builtContext, this.outputSchema, args.maxTokens);
    return this.outputSchema.parse(result);
  }
}
