/**
 * Intake link token shape — matches DB default `encode(gen_random_bytes(20), 'hex')` (migration `011_intake_tokens.sql`).
 */

export const INTAKE_TOKEN_RANDOM_BYTES = 20 as const;

export const INTAKE_TOKEN_HEX_CHAR_LENGTH = INTAKE_TOKEN_RANDOM_BYTES * 2;

/** Case-insensitive hex string of length `INTAKE_TOKEN_HEX_CHAR_LENGTH`. */
export const INTAKE_TOKEN_HEX_REGEX = new RegExp(`^[a-f0-9]{${INTAKE_TOKEN_HEX_CHAR_LENGTH}}$`, 'i');
