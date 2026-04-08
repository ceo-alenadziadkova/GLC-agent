import type { BriefResponses } from '../data/briefQuestions';

export const CLIENT_PORTAL_NEW_AUDIT_DRAFT_KEY = 'glc_portal_new_audit_draft_v1';

export type ClientPortalNewAuditDraftV1 = {
  v: 1;
  step: 0 | 1 | 2;
  url: string;
  noPublicWebsite: boolean;
  name: string;
  industry: string;
  industrySpecify: string;
  productMode: 'full' | 'express';
  responses: BriefResponses;
  briefLayoutChoice: 'unset' | 'classic' | 'wizard';
  draftAuditId: string | null;
};

export function parseClientPortalNewAuditDraft(raw: string): ClientPortalNewAuditDraftV1 | null {
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== 'object') return null;
    const d = o as Partial<ClientPortalNewAuditDraftV1>;
    if (d.v !== 1) return null;
    const step = typeof d.step === 'number' && d.step >= 0 && d.step <= 2 ? (d.step as 0 | 1 | 2) : 0;
    const bl = d.briefLayoutChoice;
    const briefLayoutChoice: 'unset' | 'classic' | 'wizard' =
      bl === 'classic' || bl === 'wizard' || bl === 'unset' ? bl : 'unset';
    return {
      v: 1,
      step,
      url: typeof d.url === 'string' ? d.url : '',
      noPublicWebsite: Boolean(d.noPublicWebsite),
      name: typeof d.name === 'string' ? d.name : '',
      industry: typeof d.industry === 'string' ? d.industry : '',
      industrySpecify: typeof d.industrySpecify === 'string' ? d.industrySpecify : '',
      productMode: d.productMode === 'express' ? 'express' : 'full',
      responses: d.responses && typeof d.responses === 'object' && !Array.isArray(d.responses)
        ? (d.responses as BriefResponses)
        : {},
      briefLayoutChoice,
      draftAuditId: typeof d.draftAuditId === 'string' && d.draftAuditId.length > 0 ? d.draftAuditId : null,
    };
  } catch {
    return null;
  }
}

export function readClientPortalNewAuditDraft(): ClientPortalNewAuditDraftV1 | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CLIENT_PORTAL_NEW_AUDIT_DRAFT_KEY);
    if (!raw) return null;
    return parseClientPortalNewAuditDraft(raw);
  } catch {
    return null;
  }
}

export function writeClientPortalNewAuditDraft(data: ClientPortalNewAuditDraftV1): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(CLIENT_PORTAL_NEW_AUDIT_DRAFT_KEY, JSON.stringify(data));
  } catch {
    /* quota or private mode */
  }
}

export function clearClientPortalNewAuditDraft(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(CLIENT_PORTAL_NEW_AUDIT_DRAFT_KEY);
  } catch {
    /* */
  }
}
