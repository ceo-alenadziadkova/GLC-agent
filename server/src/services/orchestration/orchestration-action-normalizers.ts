import type { StrategyInitiative } from '../../schemas/domain-output.js';
import type { DirectorAction } from '../../schemas/glc-director-orchestration-slice.js';
import type { OrchestrationActionNode } from '../../types/orchestration/index.js';

export function normalizeStrategyConfidence(
  confidence: StrategyInitiative['confidence'],
): NonNullable<OrchestrationActionNode['confidence']> {
  if (confidence >= 0.75) return 'high';
  if (confidence >= 0.45) return 'medium';
  return 'low';
}

export function normalizeDirectorConfidence(
  confidence: DirectorAction['confidence'],
): NonNullable<OrchestrationActionNode['confidence']> {
  return confidence;
}

export function normalizeDirectorRisk(risk: DirectorAction['risk']): number {
  return risk;
}
