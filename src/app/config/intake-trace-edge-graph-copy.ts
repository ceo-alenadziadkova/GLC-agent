import copy from '../data/intake-trace-edge-graph-copy.en.json';

export const INTAKE_TRACE_EDGE_GRAPH_COPY = copy;

export function formatWordingReviewTemplate(
  template: string,
  params: { longThreshold?: number; shortThreshold?: number },
): string {
  return template
    .replace(/\{\{longThreshold\}\}/g, params.longThreshold !== undefined ? String(params.longThreshold) : '')
    .replace(/\{\{shortThreshold\}\}/g, params.shortThreshold !== undefined ? String(params.shortThreshold) : '');
}
