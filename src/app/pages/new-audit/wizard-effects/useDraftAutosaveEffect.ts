import { useEffect } from 'react';
import type { BriefResponses } from '../../../data/briefQuestions';
import type { AuditCoveragePackage, DomainKey, IntakeVersionTuple } from '../../../data/auditTypes';
import { NEW_AUDIT_DRAFT_SAVE_DEBOUNCE_MS } from '../../../config/ui-feedback-defaults';
import { writeClientPortalNewAuditDraft } from '../../../lib/client-portal-new-audit-draft';
import type { BriefLayoutChoice } from '../wizard-state/useBriefLayoutState';

export function useDraftAutosaveEffect(params: {
  isClientSelfServe: boolean;
  step: 0 | 1 | 2;
  url: string;
  noPublicWebsite: boolean;
  name: string;
  industry: string;
  industrySpecify: string;
  briefProductMode: 'express' | 'full';
  responses: BriefResponses;
  briefLayoutChoice: BriefLayoutChoice;
  draftAuditId: string | null;
  draftIntakeVersions: IntakeVersionTuple | null;
  coveragePackage: AuditCoveragePackage | null;
  selectedDomains: DomainKey[];
}): void {
  useEffect(() => {
    if (!params.isClientSelfServe) return;
    const t = window.setTimeout(() => {
      writeClientPortalNewAuditDraft({
        v: 1,
        step: params.step,
        url: params.url,
        noPublicWebsite: params.noPublicWebsite,
        name: params.name,
        industry: params.industry,
        industrySpecify: params.industrySpecify,
        productMode: params.briefProductMode,
        responses: params.responses,
        briefLayoutChoice: params.briefLayoutChoice,
        draftAuditId: params.draftAuditId,
        draftIntakeVersions: params.draftIntakeVersions,
        ...(params.coveragePackage != null
          ? { coveragePackage: params.coveragePackage, selectedDomains: params.selectedDomains }
          : {}),
      });
    }, NEW_AUDIT_DRAFT_SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [
    params.isClientSelfServe,
    params.step,
    params.url,
    params.noPublicWebsite,
    params.name,
    params.industry,
    params.industrySpecify,
    params.briefProductMode,
    params.responses,
    params.briefLayoutChoice,
    params.draftAuditId,
    params.draftIntakeVersions,
    params.coveragePackage,
    params.selectedDomains,
  ]);
}
