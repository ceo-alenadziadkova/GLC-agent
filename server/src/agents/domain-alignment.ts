import type { z } from 'zod';

import type { DomainKey } from '@glc/intake-core';

import { BaseAgent, loadPrompt } from './base.js';
import type { BaseCollector } from '../collectors/base.js';
import { DomainAlignmentResponseSchema } from '../schemas/director-collaboration/alignment.js';

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

  override async run(): Promise<never> {
    throw new Error('DomainAlignmentAgent is scaffolded but not wired to pipeline execution yet.');
  }
}

