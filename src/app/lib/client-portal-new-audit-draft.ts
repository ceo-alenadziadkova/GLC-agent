import { INTAKE_SEQUENCING_VERSION } from '@glc/intake-core';
import { AUDIT_COVERAGE_PACKAGES, type AuditCoveragePackage, type DomainKey, type IntakeVersionTuple } from '../data/auditTypes';
import { NEW_AUDIT_ALL_COVERAGE_DOMAINS } from '../config/new-audit-coverage-policy';
import type { BriefResponses } from '../data/briefQuestions';

export const CLIENT_PORTAL_NEW_AUDIT_DRAFT_KEY = 'glc_portal_new_audit_draft_v1';
export const CONSULTANT_NEW_AUDIT_DRAFT_KEY = 'glc_consultant_new_audit_draft_v1';

function parseIntakeVersionTupleLoose(raw: unknown): IntakeVersionTuple | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const q = o.questionBankVersion;
  const p = o.policyVersion;
  const l = o.layoutVersion;
  const r = o.resolverVersion;
  const s = o.sequencingVersion;
  if (
    typeof q === 'string'
    && typeof p === 'string'
    && typeof l === 'string'
    && typeof r === 'string'
    && q.length > 0
    && p.length > 0
    && l.length > 0
    && r.length > 0
  ) {
    return {
      questionBankVersion: q,
      policyVersion: p,
      layoutVersion: l,
      resolverVersion: r,
      sequencingVersion: typeof s === 'string' && s.length > 0 ? s : INTAKE_SEQUENCING_VERSION,
    };
  }
  return null;
}

/** Persisted wizard state shared by portal and consultant `/audit/new` flows. */
export type NewAuditDraftV1 = {
  v: 1;
  step: 0 | 1 | 2 | 3;
  url: string;
  noPublicWebsite: boolean;
  name: string;
  industry: string;
  industrySpecify: string;
  productMode: 'full' | 'express';
  responses: BriefResponses;
  briefLayoutChoice: 'unset' | 'classic' | 'wizard';
  draftAuditId: string | null;
  /** Last known intake version tuple from server brief (analytics + parity). */
  draftIntakeVersions?: IntakeVersionTuple | null;
  /** Portal flow: explicit coverage choice (no server default). */
  coveragePackage?: AuditCoveragePackage;
  selectedDomains?: DomainKey[];
};

/** Alias preserved for callers that referenced the portal-specific name */
export type ClientPortalNewAuditDraftV1 = NewAuditDraftV1;

function parseDraftCoveragePackage(raw: unknown): AuditCoveragePackage | undefined {
  return AUDIT_COVERAGE_PACKAGES.includes(raw as AuditCoveragePackage) ? (raw as AuditCoveragePackage) : undefined;
}

function parseDraftSelectedDomains(raw: unknown): DomainKey[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const allowed = new Set<string>(NEW_AUDIT_ALL_COVERAGE_DOMAINS);
  const out = raw.filter((x): x is DomainKey => typeof x === 'string' && allowed.has(x));
  return out.length > 0 ? out : undefined;
}

export function parseNewAuditDraftV1(raw: string): NewAuditDraftV1 | null {
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== 'object') return null;
    const d = o as Partial<NewAuditDraftV1>;
    if (d.v !== 1) return null;
    const step = typeof d.step === 'number' && d.step >= 0 && d.step <= 3 ? (d.step as 0 | 1 | 2 | 3) : 0;
    const bl = d.briefLayoutChoice;
    const briefLayoutChoice: 'unset' | 'classic' | 'wizard' =
      bl === 'classic' || bl === 'wizard' || bl === 'unset' ? bl : 'unset';
    const parsedVersions = parseIntakeVersionTupleLoose(d.draftIntakeVersions);
    const parsedPkg = parseDraftCoveragePackage(d.coveragePackage);
    const parsedDomains = parseDraftSelectedDomains(d.selectedDomains);
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
      ...(parsedVersions != null ? { draftIntakeVersions: parsedVersions } : {}),
      ...(parsedPkg != null ? { coveragePackage: parsedPkg } : {}),
      ...(parsedDomains != null ? { selectedDomains: parsedDomains } : {}),
    };
  } catch {
    return null;
  }
}

export function parseClientPortalNewAuditDraft(raw: string): NewAuditDraftV1 | null {
  return parseNewAuditDraftV1(raw);
}

export function readClientPortalNewAuditDraft(): NewAuditDraftV1 | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CLIENT_PORTAL_NEW_AUDIT_DRAFT_KEY);
    if (!raw) return null;
    return parseNewAuditDraftV1(raw);
  } catch {
    return null;
  }
}

export function writeClientPortalNewAuditDraft(data: NewAuditDraftV1): void {
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

export function readConsultantNewAuditDraft(): NewAuditDraftV1 | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CONSULTANT_NEW_AUDIT_DRAFT_KEY);
    if (!raw) return null;
    return parseNewAuditDraftV1(raw);
  } catch {
    return null;
  }
}

export function writeConsultantNewAuditDraft(data: NewAuditDraftV1): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(CONSULTANT_NEW_AUDIT_DRAFT_KEY, JSON.stringify(data));
  } catch {
    /* quota or private mode */
  }
}

export function clearConsultantNewAuditDraft(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(CONSULTANT_NEW_AUDIT_DRAFT_KEY);
  } catch {
    /* */
  }
}
