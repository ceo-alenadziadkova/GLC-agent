/**
 * Redact high-entropy path segments so HTTP access logs stay structured without leaking tokens.
 */
const INTAKE_TOKEN = /(\/api\/intake\/)([a-f0-9]{40})(?=\/|$)/gi;
const SNAPSHOT_TOKEN =
  /(\/api\/snapshot\/)([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?=\/|$)/gi;

export function redactRequestPath(path: string): string {
  return path.replace(INTAKE_TOKEN, '$1[token]').replace(SNAPSHOT_TOKEN, '$1[token]');
}
