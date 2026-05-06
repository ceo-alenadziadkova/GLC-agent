import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';

/** Prefix for grep-friendly lock / lease identifiers in logs and Redis. */
const LOCK_TOKEN_PREFIX = 'glc:' as const;

function safeHostname(): string {
  try {
    return hostname() || 'UNKNOWN_HOST';
  } catch {
    return 'UNKNOWN_HOST';
  }
}

/**
 * Globally unique lock owner token for distributed leases (avoids PID collisions in containers).
 * Format: glc:<uuid>:<hostname>
 */
export function generateLockToken(): string {
  return `${LOCK_TOKEN_PREFIX}${randomUUID()}:${safeHostname()}`;
}
