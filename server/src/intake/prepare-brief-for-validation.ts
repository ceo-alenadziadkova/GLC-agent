/**
 * Shallow copy before persist/validate — bank ids are canonical; no legacy merge/hydration.
 */
export function prepareBriefForValidation(responses: Record<string, unknown>): Record<string, unknown> {
  return { ...responses };
}
