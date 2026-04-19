/**
 * Client-side persistence for cookie category choices (banner + settings panel).
 * Version alignment uses `LEGAL_DOCUMENT_VERSIONS.cookiesPolicy` from `@glc/api-paths`.
 */

/** localStorage key for the persisted JSON payload. */
export const COOKIE_CONSENT_LOCAL_STORAGE_KEY = 'glc_cookie_consent_v1';

/** JSON `schema` field inside the stored object (forward-compatible migrations). */
export const COOKIE_CONSENT_PAYLOAD_SCHEMA_VERSION = 1 as const;

export type CookieConsentPayloadSchemaVersion = typeof COOKIE_CONSENT_PAYLOAD_SCHEMA_VERSION;
