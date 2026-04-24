import { describe, expect, it } from 'vitest';
import { LEGAL_DOCUMENT_VERSIONS } from '@glc/api-paths';
import {
  isPersistedConsentCurrentPolicy,
  parseCookieConsentPayload,
} from './cookie-consent-storage';

describe('cookie-consent-storage', () => {
  it('parseCookieConsentPayload returns null for invalid JSON', () => {
    expect(parseCookieConsentPayload('not json')).toBeNull();
  });

  it('parseCookieConsentPayload returns null for wrong schema version', () => {
    expect(
      parseCookieConsentPayload(
        JSON.stringify({
          schema: 99,
          cookiesPolicyVersion: LEGAL_DOCUMENT_VERSIONS.cookiesPolicy,
          productAnalytics: true,
          marketing: false,
        }),
      ),
    ).toBeNull();
  });

  it('parseCookieConsentPayload accepts valid v1 payload', () => {
    const payload = parseCookieConsentPayload(
      JSON.stringify({
        schema: 1,
        cookiesPolicyVersion: LEGAL_DOCUMENT_VERSIONS.cookiesPolicy,
        productAnalytics: true,
        marketing: true,
      }),
    );
    expect(payload).toEqual({
      schema: 1,
      cookiesPolicyVersion: LEGAL_DOCUMENT_VERSIONS.cookiesPolicy,
      productAnalytics: true,
      marketing: true,
    });
  });

  it('isPersistedConsentCurrentPolicy is false when policy version drifts', () => {
    const stale = parseCookieConsentPayload(
      JSON.stringify({
        schema: 1,
        cookiesPolicyVersion: '0.0.0-stale',
        productAnalytics: false,
        marketing: false,
      }),
    );
    expect(stale).not.toBeNull();
    expect(isPersistedConsentCurrentPolicy(stale)).toBe(false);
  });

  it('isPersistedConsentCurrentPolicy is true for current package version', () => {
    const fresh = parseCookieConsentPayload(
      JSON.stringify({
        schema: 1,
        cookiesPolicyVersion: LEGAL_DOCUMENT_VERSIONS.cookiesPolicy,
        productAnalytics: false,
        marketing: false,
      }),
    );
    expect(fresh).not.toBeNull();
    expect(isPersistedConsentCurrentPolicy(fresh)).toBe(true);
  });
});
