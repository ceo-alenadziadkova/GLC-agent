/**
 * Non-complete coverage: keep a single primary competitor string for agent context.
 * Heuristic: first non-empty segment split on newlines, commas, semicolons.
 */
export function extractPrimaryCompetitor(value: unknown): string | null {
  const raw = Array.isArray(value) ? value.join('\n') : String(value ?? '');
  const first = raw
    .split(/[\n,;]+/)
    .map(x => x.trim())
    .find(Boolean);
  return first ?? null;
}
