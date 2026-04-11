/**
 * Canonical `/api/...` path prefixes. Single source for Express mounts, idempotency keys, and
 * contract checks against `src/app/config/api-paths.ts`.
 */

export const API_HTTP_PATH_PREFIX = {
  public: '/api/public',
  profile: '/api/profile',
  platform: '/api/platform',
  snapshot: '/api/snapshot',
  intake: '/api/intake',
  intakeTraceTool: '/api/intake-trace-tool',
  discover: '/api/discover',
  marketing: '/api/marketing',
  auditRequests: '/api/audit-requests',
  analytics: '/api/analytics',
  notifications: '/api/notifications',
  audits: '/api/audits',
  log: '/api/log',
} as const;

export type ApiHttpPathPrefixKey = keyof typeof API_HTTP_PATH_PREFIX;

/** `POST:${path}` for idempotency storage (must stay stable for existing keys). */
export function idempotencyPostKey(path: string): string {
  return `POST:${path}`;
}

export function idempotencyPostAuditsCreateKey(): string {
  return idempotencyPostKey(API_HTTP_PATH_PREFIX.audits);
}

export function idempotencyPostAuditRequestApproveKey(requestId: string): string {
  const id = encodeURIComponent(requestId);
  return idempotencyPostKey(`${API_HTTP_PATH_PREFIX.auditRequests}/${id}/approve`);
}
