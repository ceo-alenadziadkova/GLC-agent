import { describe, expect, it, beforeEach } from 'vitest';
import type { DomainKey } from '../../data/auditTypes';
import {
  clearConsultantNewAuditDraft,
  CONSULTANT_NEW_AUDIT_DRAFT_KEY,
  readConsultantNewAuditDraft,
  writeConsultantNewAuditDraft,
} from '../client-portal-new-audit-draft';

describe('consultant new audit draft persistence', () => {
  beforeEach(() => {
    sessionStorage.removeItem(CONSULTANT_NEW_AUDIT_DRAFT_KEY);
  });

  it('round-trips draft through sessionStorage', () => {
    const selectedDomains: DomainKey[] = ['ux_conversion'];
    const draft = {
      v: 1 as const,
      step: 2 as 0 | 1 | 2 | 3,
      url: 'https://example.com',
      noPublicWebsite: false,
      name: 'Co',
      industry: 'Retail',
      industrySpecify: '',
      productMode: 'full' as const,
      responses: { a1: { value: 'x', source: 'consultant' as const } },
      briefLayoutChoice: 'wizard' as const,
      draftAuditId: 'audit-test-1',
      draftIntakeVersions: null,
      coveragePackage: 'pro' as const,
      selectedDomains,
    };

    writeConsultantNewAuditDraft(draft);
    const read = readConsultantNewAuditDraft();
    expect(read).not.toBeNull();
    expect(read?.draftAuditId).toBe('audit-test-1');
    expect(read?.step).toBe(2);
    expect(read?.responses).toEqual(draft.responses);
    expect(read?.coveragePackage).toBe('pro');
  });

  it('clearConsultantNewAuditDraft removes the key', () => {
    writeConsultantNewAuditDraft({
      v: 1,
      step: 0,
      url: '',
      noPublicWebsite: false,
      name: '',
      industry: '',
      industrySpecify: '',
      productMode: 'full',
      responses: {},
      briefLayoutChoice: 'unset',
      draftAuditId: null,
    });
    expect(sessionStorage.getItem(CONSULTANT_NEW_AUDIT_DRAFT_KEY)).not.toBeNull();
    clearConsultantNewAuditDraft();
    expect(sessionStorage.getItem(CONSULTANT_NEW_AUDIT_DRAFT_KEY)).toBeNull();
  });
});
