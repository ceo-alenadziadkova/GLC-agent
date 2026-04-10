import { describe, expect, it } from 'vitest';
import { ApiError } from '../data/api-error';
import {
  buildStep0IntakePatch,
  isSelfServeOwnerConfigApiError,
  websiteAnswerToAuditUrl,
} from './new-audit-helpers';

describe('new-audit-helpers', () => {
  describe('websiteAnswerToAuditUrl', () => {
    it('normalizes host-only answers to https url', () => {
      expect(websiteAnswerToAuditUrl('example.com')).toBe('https://example.com');
    });

    it('returns undefined for placeholder no-website values', () => {
      expect(websiteAnswerToAuditUrl('none')).toBeUndefined();
      expect(websiteAnswerToAuditUrl('No Website')).toBeUndefined();
      expect(websiteAnswerToAuditUrl('n/a')).toBeUndefined();
    });
  });

  describe('buildStep0IntakePatch', () => {
    it('sets website to "none" when noPublicWebsite is true', () => {
      const patch = buildStep0IntakePatch('ACME', 'SaaS', '', 'example.com', true, 'client');
      expect(patch.intake_company_website).toEqual({ value: 'none', source: 'client' });
    });

    it('keeps industry specify only for Other industry', () => {
      const withOther = buildStep0IntakePatch('ACME', 'Other', 'Boutique hotels', 'example.com', false, 'client');
      expect(withOther.intake_industry_specify).toEqual({ value: 'Boutique hotels', source: 'client' });

      const withoutOther = buildStep0IntakePatch('ACME', 'SaaS', 'Should be ignored', 'example.com', false, 'client');
      expect(withoutOther.intake_industry_specify).toBeUndefined();
    });

    it('normalizes url protocol when public website exists', () => {
      const patch = buildStep0IntakePatch('ACME', 'SaaS', '', 'example.com', false, 'consultant');
      expect(patch.intake_company_website).toEqual({ value: 'https://example.com', source: 'consultant' });
    });
  });

  describe('isSelfServeOwnerConfigApiError', () => {
    it('matches explicit owner-unavailable API code', () => {
      const err = new ApiError('owner missing', 503, 'SELF_SERVE_OWNER_UNAVAILABLE');
      expect(isSelfServeOwnerConfigApiError(err)).toBe(true);
    });

    it('matches fallback message text for legacy backend responses', () => {
      const err = new ApiError('We could not assign ownership for this audit right now.', 503);
      expect(isSelfServeOwnerConfigApiError(err)).toBe(true);
    });

    it('does not match unrelated errors', () => {
      const err = new ApiError('Forbidden', 403, 'FORBIDDEN');
      expect(isSelfServeOwnerConfigApiError(err)).toBe(false);
      expect(isSelfServeOwnerConfigApiError(new Error('boom'))).toBe(false);
    });
  });
});
