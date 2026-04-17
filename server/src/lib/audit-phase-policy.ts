import { DOMAIN_KEYS, type DomainKey } from '@glc/intake-core';

import {
  DOMAIN_PHASES,
  EXPRESS_MAX_PHASE,
  EXPRESS_REVIEW_AFTER_PHASES,
  FREE_SNAPSHOT_MAX_PHASE,
  PIPELINE_UX_BLOCK_END_PHASE,
  REVIEW_AFTER_PHASES,
} from '../config/audit-phase-constants.js';
import { PIPELINE_MAX_PHASE_INDEX, PIPELINE_MIN_PHASE } from '../config/pipeline-phases.js';
import type { AuditExecutionPlan } from '../types/audit/execution-plan.js';
import type { ProductMode } from '../types/audit/product.js';

/** Returns the max phase number for a given product mode. */
export function maxPhaseForMode(mode: ProductMode): number {
  if (mode === 'free_snapshot') return FREE_SNAPSHOT_MAX_PHASE;
  if (mode === 'express') return EXPRESS_MAX_PHASE;
  return PIPELINE_MAX_PHASE_INDEX;
}

/** Returns which review gates apply for a given product mode. */
export function reviewPhasesForMode(mode: ProductMode): readonly number[] {
  if (mode === 'free_snapshot') return [];
  if (mode === 'express') return EXPRESS_REVIEW_AFTER_PHASES;
  return REVIEW_AFTER_PHASES;
}

export function uniqueDomainKeys(input: readonly DomainKey[]): DomainKey[] {
  return DOMAIN_KEYS.filter((key) => input.includes(key));
}

export function executionPlanToPhases(plan: AuditExecutionPlan): number[] {
  const selected = uniqueDomainKeys(plan.selected_domains);
  const domainPhases = selected.map((d) => DOMAIN_PHASES[d]).sort((a, b) => a - b);
  const includeStrategy = plan.include_strategy === true;
  return [PIPELINE_MIN_PHASE, ...domainPhases, ...(includeStrategy ? [PIPELINE_MAX_PHASE_INDEX] : [])];
}

export function reviewPhasesForExecutionPlan(plan: AuditExecutionPlan): number[] {
  const phases = executionPlanToPhases(plan);
  const reviews = new Set<number>();
  if (phases.includes(PIPELINE_MIN_PHASE)) reviews.add(PIPELINE_MIN_PHASE);
  if (phases.some((p) => p >= 1 && p <= PIPELINE_UX_BLOCK_END_PHASE)) {
    reviews.add(PIPELINE_UX_BLOCK_END_PHASE);
  }
  if (phases.includes(PIPELINE_MAX_PHASE_INDEX)) reviews.add(PIPELINE_MAX_PHASE_INDEX);
  return Array.from(reviews).sort((a, b) => a - b);
}

export function maxPhaseForExecutionPlan(plan: AuditExecutionPlan): number {
  const phases = executionPlanToPhases(plan);
  return phases.length > 0 ? Math.max(...phases) : 0;
}
