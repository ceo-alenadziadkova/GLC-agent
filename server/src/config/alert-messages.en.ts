/**
 * English copy for pipeline alert notifications (in-app + Telegram).
 * Thresholds stay env-driven in `services/alerts.ts`.
 */

export const pipelineAlertTitlesEn = {
  failureRateHigh: 'Pipeline failure rate high',
  latencyP95High: 'Pipeline latency high',
  tokenBurnHigh: 'Token burn high',
} as const;

export function formatPipelineFailureRateMessageEn(input: {
  failureRatePct: string;
  failed: number;
  started: number;
  windowMin: number;
  traceSuffix: string;
}): string {
  return `Failure rate ${input.failureRatePct}% in last ${input.windowMin}m (failed=${input.failed}, started=${input.started})${input.traceSuffix}`;
}

export function formatPipelineLatencyP95MessageEn(input: {
  p95Ms: number;
  windowMin: number;
  thresholdMs: number;
  traceSuffix: string;
}): string {
  return `Latency p95=${input.p95Ms}ms in last ${input.windowMin}m (threshold=${input.thresholdMs}ms)${input.traceSuffix}`;
}

export function formatPipelineTokenBurnMessageEn(input: {
  tokenBurn: number;
  windowMin: number;
  threshold: number;
  traceSuffix: string;
}): string {
  return `Token burn ${input.tokenBurn} in last ${input.windowMin}m (threshold=${input.threshold})${input.traceSuffix}`;
}
