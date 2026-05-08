import type { z } from 'zod';

import type { DomainKey } from '@glc/intake-core';

import { BaseAgent, loadPrompt } from './base.js';
import type { BaseCollector } from '../collectors/base.js';
import { DomainHypothesisDraftSchema } from '../schemas/director-collaboration/hypothesis.js';

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

  override async run(): Promise<never> {
    throw new Error('DomainHypothesisAgent is scaffolded but not wired to pipeline execution yet.');
  }
}

