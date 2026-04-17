import type { RuleResult } from '../../types.js';
import { SNAPSHOT_PARTIAL_SCORE_FACTOR } from '../../../config/snapshot-partial-score.js';

export type EvaluatorStatus = RuleResult['status'];

export function scoreStatus(max: number, status: EvaluatorStatus): number {
  if (status === 'pass') return max;
  if (status === 'partial') return max * SNAPSHOT_PARTIAL_SCORE_FACTOR;
  return 0;
}
