import type { StrategyInitiative } from '../../schemas/domain-output.js';
import type { DirectorAction } from '../../schemas/glc-director-orchestration-slice.js';
import type { OrchestrationActionNode } from '../../types/orchestration/index.js';
import { ORCHESTRATION_CONTRACT_POLICY } from '../../config/orchestration-contract-policy.js';
import {
  DIRECTOR_ORCHESTRATION_CONFIDENCE_LEVELS,
  DIRECTOR_ORCHESTRATION_RISK_POLICY,
} from '../../config/director-orchestration-policy.js';

export function normalizeStrategyConfidence(
  confidence: StrategyInitiative['confidence'],
): NonNullable<OrchestrationActionNode['confidence']> {
  if (confidence >= ORCHESTRATION_CONTRACT_POLICY.strategyConfidenceHighFloor) return 'high';
  if (confidence >= ORCHESTRATION_CONTRACT_POLICY.strategyConfidenceMediumFloor) return 'medium';
  return 'low';
}

export function normalizeDirectorConfidence(
  confidence: DirectorAction['confidence'],
): NonNullable<OrchestrationActionNode['confidence']> {
  if (DIRECTOR_ORCHESTRATION_CONFIDENCE_LEVELS.includes(confidence)) {
    return confidence;
  }
  return 'medium';
}

export function normalizeDirectorRisk(risk: DirectorAction['risk']): number {
  if (!Number.isFinite(risk)) {
    return DIRECTOR_ORCHESTRATION_RISK_POLICY.fallback;
  }
  return Math.min(
    DIRECTOR_ORCHESTRATION_RISK_POLICY.max,
    Math.max(DIRECTOR_ORCHESTRATION_RISK_POLICY.min, risk),
  );
}
