import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import { PipelineOrchestrator } from './pipeline/orchestrator/PipelineOrchestrator.js';
import { recoverStalledPipelines as recoverStalledPipelinesService } from './pipeline/recovery/recoverStalledPipelines.js';

const STALLED_PHASE_TIMEOUT_MIN = SYSTEM_DEFAULTS.pipelineOrchestrator.stalledPhaseTimeoutMin;

export { PipelineOrchestrator };

/**
 * Mark long-running active audits as stalled/failed so users can retry.
 * This is a minimal recovery guard until durable queue orchestration is introduced.
 */
export async function recoverStalledPipelines(timeoutMinutes = STALLED_PHASE_TIMEOUT_MIN): Promise<number> {
  return recoverStalledPipelinesService(timeoutMinutes);
}
