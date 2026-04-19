import { LEGAL_DOCUMENT_VERSIONS } from '@glc/api-paths';
import {
  COOKIE_CONSENT_LOCAL_STORAGE_KEY,
  COOKIE_CONSENT_PAYLOAD_SCHEMA_VERSION,
  type CookieConsentPayloadSchemaVersion,
} from '../config/cookie-consent-storage-policy';

export type CookieConsentPersistedV1 = {
  readonly schema: CookieConsentPayloadSchemaVersion;
  readonly cookiesPolicyVersion: string;
  readonly productAnalytics: boolean;
  readonly marketing: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseCookieConsentPayload(raw: string | null): CookieConsentPersistedV1 | null {
  if (raw == null || raw === '') return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (parsed.schema !== COOKIE_CONSENT_PAYLOAD_SCHEMA_VERSION) return null;
    if (typeof parsed.cookiesPolicyVersion !== 'string' || parsed.cookiesPolicyVersion === '') return null;
    if (typeof parsed.productAnalytics !== 'boolean') return null;
    if (typeof parsed.marketing !== 'boolean') return null;
    return {
      schema: COOKIE_CONSENT_PAYLOAD_SCHEMA_VERSION,
      cookiesPolicyVersion: parsed.cookiesPolicyVersion,
      productAnalytics: parsed.productAnalytics,
      marketing: parsed.marketing,
    };
  } catch {
    return null;
  }
}

export function isPersistedConsentCurrentPolicy(payload: CookieConsentPersistedV1 | null): boolean {
  if (payload == null) return false;
  return payload.cookiesPolicyVersion === LEGAL_DOCUMENT_VERSIONS.cookiesPolicy;
}

export function readCookieConsentFromStorage(): CookieConsentPersistedV1 | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_LOCAL_STORAGE_KEY);
    const parsed = parseCookieConsentPayload(raw);
    if (parsed == null) return null;
    return isPersistedConsentCurrentPolicy(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCookieConsentToStorage(payload: CookieConsentPersistedV1): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(COOKIE_CONSENT_LOCAL_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function clearCookieConsentStorage(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(COOKIE_CONSENT_LOCAL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
