/**
 * Cryptographic parameters for discovery `contact_edit_key` issuance and storage.
 * Centralized static CONFIG (not ENV): changing values invalidates verification for existing rows unless migrated.
 */

/** Raw key length before hex encoding (returned to the client once). */
export const DISCOVER_CONTACT_EDIT_KEY_RANDOM_BYTES = 32;

/** Salt length for scrypt-based storage hash (hex-encoded salt embedded in stored value). */
export const DISCOVER_CONTACT_EDIT_KEY_SCRYPT_SALT_RANDOM_BYTES = 16;

/** Derived key length for scrypt (bytes). */
export const DISCOVER_CONTACT_EDIT_KEY_SCRYPT_KEYLEN = 64;
