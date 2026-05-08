import type { z } from 'zod';

import { BaseAgent, loadPrompt } from './base.js';
import type { BaseCollector } from '../collectors/base.js';
import { CrossDomainConflictResolutionSchema } from '../schemas/director-collaboration/conflict-resolution.js';

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

  override async run(): Promise<never> {
    throw new Error('CrossDomainConflictResolverAgent is scaffolded but not wired to pipeline execution yet.');
  }
}

