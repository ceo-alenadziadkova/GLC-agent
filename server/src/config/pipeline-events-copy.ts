/**
 * English pipeline event messages (log UI / pipeline_events). Loaded from JSON for CMS-style edits without code churn.
 */
import raw from './pipeline-events-copy.v1.json' with { type: 'json' };

export const PIPELINE_EVENTS_COPY_VERSION = raw.version as string;

export type ReconPipelineEventCopy = (typeof raw)['agents']['recon'];
export type BasePipelineEventCopy = (typeof raw)['agents']['base'];
export type StrategyPipelineEventCopy = (typeof raw)['agents']['strategy'];

export function pipelineReconEventCopy(): ReconPipelineEventCopy {
  return raw.agents.recon;
}

export function pipelineBaseEventCopy(): BasePipelineEventCopy {
  return raw.agents.base;
}

export function pipelineStrategyEventCopy(): StrategyPipelineEventCopy {
  return raw.agents.strategy;
}

export function interpolatePipelineEventMessage(
  template: string,
  vars: Record<string, string | number>,
): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(String(v));
  }
  return out;
}
