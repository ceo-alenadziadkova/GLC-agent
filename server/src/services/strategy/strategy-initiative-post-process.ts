import type { DomainKey } from '@glc/intake-core';
import type { z } from 'zod';

import {
  STRATEGY_PATH_INCOMPATIBILITY,
  type StrategyConstraintBudgetBand,
} from '../../config/strategy-initiative-policy.js';
import { StrategyInitiativeSchema } from '../../schemas/domain-output.js';
import type { StrategyBriefConstraintSnapshot } from './strategy-brief-constraint-snapshot.js';

export type StrategyInitiativeParsed = z.infer<typeof StrategyInitiativeSchema>;

export type StrategyInitiativePostProcessed = StrategyInitiativeParsed & {
  evidence_verified: boolean;
};

function budgetBandRejectsScalable(band: StrategyConstraintBudgetBand): boolean {
  return (STRATEGY_PATH_INCOMPATIBILITY.budgetBandsThatRejectScalable as readonly string[]).includes(band);
}

/**
 * Marks execution paths incompatible with brief constraints (deterministic; no LLM).
 */
export function applyExecutionPathConstraints(
  initiative: StrategyInitiativeParsed,
  brief: StrategyBriefConstraintSnapshot,
): StrategyInitiativeParsed['execution_paths'] {
  const rejectScalable = budgetBandRejectsScalable(brief.budget_band);
  const rejectForWeakIdeaSignal =
    brief.idea_validation_signal === 'weak'
    || brief.idea_icp_clarity === 'broad'
    || !brief.idea_gtm_test_ready;
  return initiative.execution_paths.map((path) => {
    if (path.type === 'scalable' && rejectScalable) {
      return {
        ...path,
        incompatible: true,
        incompatibility_reason: 'budget_band_low',
      };
    }
    if (path.type === 'scalable' && rejectForWeakIdeaSignal) {
      return {
        ...path,
        incompatible: true,
        incompatibility_reason: 'idea_signal_not_ready',
      };
    }
    return { ...path };
  });
}

/**
 * Returns true when every evidence source that names an `issue_id` resolves to a stored issue id for that domain.
 */
export function verifyInitiativeEvidence(
  initiative: StrategyInitiativeParsed,
  issueIdsByDomain: Map<DomainKey, Set<string>>,
): boolean {
  for (const src of initiative.evidence.sources) {
    if (!src.issue_id?.trim()) continue;
    const set = issueIdsByDomain.get(src.domain_key as DomainKey);
    if (!set || !set.has(src.issue_id.trim())) return false;
  }
  return true;
}

export function postProcessStrategyInitiatives(
  initiatives: StrategyInitiativeParsed[],
  brief: StrategyBriefConstraintSnapshot,
  issueIdsByDomain: Map<DomainKey, Set<string>>,
): StrategyInitiativePostProcessed[] {
  return initiatives.map((init) => ({
    ...init,
    execution_paths: applyExecutionPathConstraints(init, brief),
    evidence_verified: verifyInitiativeEvidence(init, issueIdsByDomain),
  }));
}
