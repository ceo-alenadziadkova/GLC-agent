/**
 * Resolve which task id should receive selection/focus on first hydration.
 *
 * Priority:
 *   1. URL `?task=<id>` if it exists in the projection.
 *   2. Resolved focus id from `usePlanFocusPackNodeId` (e.g. canonical key → task id) if present.
 *   3. `null` — let downstream effects pick the first available task.
 */
export function resolveTaskFocusFromUrl(args: {
  urlTaskParam: string;
  fallbackResolvedFocusTaskId: string | null;
  projectionTaskIds: ReadonlySet<string>;
}): string | null {
  const { urlTaskParam, fallbackResolvedFocusTaskId, projectionTaskIds } = args;
  if (urlTaskParam && projectionTaskIds.has(urlTaskParam)) return urlTaskParam;
  if (fallbackResolvedFocusTaskId && projectionTaskIds.has(fallbackResolvedFocusTaskId)) {
    return fallbackResolvedFocusTaskId;
  }
  return null;
}
