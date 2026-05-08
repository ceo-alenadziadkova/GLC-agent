import type { z } from 'zod';

import { BaseAgent, loadPrompt } from './base.js';
import type { BaseCollector } from '../collectors/base.js';
import { ClientSituationSnapshotSchema } from '../schemas/director-collaboration/client-situation.js';

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

  override async run(): Promise<never> {
    throw new Error('ContextDirectorAgent is scaffolded but not wired to pipeline execution yet.');
  }
}

