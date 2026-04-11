/**
 * Express HTTP server tuning (env-driven).
 */

/** Max JSON body size (default `2mb`). Set `JSON_BODY_LIMIT` to e.g. `1mb`, `512kb`. */
export function getExpressJsonBodyLimit(): string {
  const raw = process.env.JSON_BODY_LIMIT?.trim();
  return raw && raw.length > 0 ? raw : '2mb';
}
