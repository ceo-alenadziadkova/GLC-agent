/**
 * Fact-checker correction copy (issues / evidence / score labels). Edit JSON without code churn.
 */
import raw from './fact-checker-copy.v1.json' with { type: 'json' };

import { interpolatePipelineEventMessage } from './pipeline-events-copy.js';

export const FACT_CHECKER_COPY_VERSION = raw.version as string;

export type FactCheckerCopy = typeof raw;

export function factCheckerCopy(): FactCheckerCopy {
  return raw;
}

export function interpolateFactCheckerMessage(
  template: string,
  vars: Record<string, string | number>,
): string {
  return interpolatePipelineEventMessage(template, vars);
}
