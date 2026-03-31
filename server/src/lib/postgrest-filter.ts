/**
 * Builds a safe PostgREST OR filter for owner/client audit access.
 * User input is quoted and escaped so commas/parentheses/quotes cannot alter
 * the OR expression grammar.
 */
export function safeOrUserFilter(uid: string): string {
  const escaped = `"${uid.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  return `user_id.eq.${escaped},client_id.eq.${escaped}`;
}
