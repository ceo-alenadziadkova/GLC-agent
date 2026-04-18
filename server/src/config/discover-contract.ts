/**
 * Discovery session API contract (aligned with Postgres defaults and CHECK constraints).
 * @see server/migrations/013_discovery_sessions.sql — `session_token` default `encode(gen_random_bytes(20), 'hex')`
 * @see server/migrations/032_discovery_consultant_claim_and_maturity_guard.sql — `maturity_level` 1..5
 * @see server/migrations/033_discovery_contact_edit_key.sql — contact edit key hashing (32-byte raw = 64 hex)
 */

/** Bytes used by DB default for `session_token` before hex encoding. */
export const DISCOVER_SESSION_TOKEN_BYTES = 20;

export const DISCOVER_SESSION_TOKEN_HEX_LEN = DISCOVER_SESSION_TOKEN_BYTES * 2;

/** `createContactEditKey()` uses `randomBytes(32).toString('hex')`. */
export const DISCOVER_CONTACT_EDIT_KEY_BYTES = 32;

export const DISCOVER_CONTACT_EDIT_KEY_HEX_LEN = DISCOVER_CONTACT_EDIT_KEY_BYTES * 2;

export const DISCOVER_SESSION_TOKEN_PATTERN = new RegExp(
  `^[a-f0-9]{${DISCOVER_SESSION_TOKEN_HEX_LEN}}$`,
  'i',
);

export const DISCOVER_CONTACT_EDIT_KEY_PATTERN = new RegExp(
  `^[a-f0-9]{${DISCOVER_CONTACT_EDIT_KEY_HEX_LEN}}$`,
  'i',
);

export const DISCOVER_MATURITY_MIN = 1 as const;
export const DISCOVER_MATURITY_MAX = 5 as const;

export function isDiscoverMaturityLevel(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= DISCOVER_MATURITY_MIN &&
    value <= DISCOVER_MATURITY_MAX
  );
}
