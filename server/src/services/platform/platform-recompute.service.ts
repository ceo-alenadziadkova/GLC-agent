import { computeAndStoreBenchmarkSnapshots } from '../benchmark-snapshot.js';
import { banditService } from '../bandit.js';
import type { DomainKey } from '../../types/audit.js';

export async function recomputeBenchmarkSnapshots() {
  return computeAndStoreBenchmarkSnapshots();
}

export async function recomputeBanditPerformance(phaseId: DomainKey | undefined, dryRun: boolean) {
  return banditService.recomputeArmPerformanceFromEvaluationDatasets(phaseId, { dryRun });
}
