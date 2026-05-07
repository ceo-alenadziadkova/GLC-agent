/**
 * Pipeline service — public entry re-export.
 *
 * Implementation lives in `./pipeline/`. New code goes inside the folder.
 */

export { PipelineOrchestrator } from './pipeline/orchestrator/PipelineOrchestrator.js';
export { recoverStalledPipelines } from './pipeline/recovery/recoverStalledPipelines.js';
