import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useDraftAutosaveEffect } from '../wizard-effects/useDraftAutosaveEffect';
import { useDraftIntakeVersionsEffect } from '../wizard-effects/useDraftIntakeVersionsEffect';
import { api, ApiError } from '../../../data/apiService';
import { APP_ROUTE_PATHS } from '../../../config/route-paths';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { resolveConsultantBriefLayout } from '../../../lib/client-brief-layout-preference';
import {
  BRIEF_LAYOUT_CLASSIC as BRIEF_LAYOUT_CLASSIC_CONST,
  BRIEF_LAYOUT_UNSET as BRIEF_LAYOUT_UNSET_CONST,
  BRIEF_LAYOUT_WIZARD as BRIEF_LAYOUT_WIZARD_CONST,
} from '../wizard-config/wizard-constants';
import { bootstrapConsultantNewAuditWizardFromAuditState } from '../wizard-services/consultant-resume-draft-audit.bootstrap';
import type { AuditCoveragePackage, IntakeVersionTuple } from '../../../data/auditTypes';
import type { BriefResponses } from '../../../data/briefQuestions';
import type { DomainKey } from '../../../data/auditTypes';

export function useWizardDraftPersistence(params: {
  isClientSelfServe: boolean;
  resumeDraftAuditIdFromQuery: string;
  resumeDraftQueryHydrateComplete: boolean;
  setResumeDraftQueryHydrateComplete: Dispatch<SetStateAction<boolean>>;
  navigate: (to: { pathname: string; search: string }, opts: { replace: boolean }) => void;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  draftAuditId: string | null;
  setDraftAuditId: Dispatch<SetStateAction<string | null>>;
  setUrl: Dispatch<SetStateAction<string>>;
  setNoPublicWebsite: Dispatch<SetStateAction<boolean>>;
  setName: Dispatch<SetStateAction<string>>;
  setIndustry: Dispatch<SetStateAction<string>>;
  setIndustrySpecify: Dispatch<SetStateAction<string>>;
  setResponses: Dispatch<SetStateAction<BriefResponses>>;
  setDraftIntakeVersions: Dispatch<SetStateAction<IntakeVersionTuple | null>>;
  setCoveragePackage: Dispatch<SetStateAction<AuditCoveragePackage | null>>;
  setSelectedDomains: Dispatch<SetStateAction<DomainKey[]>>;
  setBriefTailoredPhaseUnlocked: Dispatch<SetStateAction<boolean>>;
  setBriefLayoutChoice: Dispatch<SetStateAction<'unset' | 'classic' | 'wizard'>>;
  setInterviewMode: Dispatch<SetStateAction<boolean>>;
  setStep: Dispatch<SetStateAction<0 | 1 | 2 | 3>>;
  setBasicsSubStep: Dispatch<SetStateAction<0 | 1>>;
  setDraftRestoredVisible: Dispatch<SetStateAction<boolean>>;
  step: 0 | 1 | 2 | 3;
  url: string;
  noPublicWebsite: boolean;
  name: string;
  industry: string;
  industrySpecify: string;
  briefProductMode: 'express' | 'full';
  responses: BriefResponses;
  briefLayoutChoice: 'unset' | 'classic' | 'wizard';
  draftIntakeVersions: IntakeVersionTuple | null;
  coveragePackage: AuditCoveragePackage | null;
  selectedDomains: DomainKey[];
}) {
  const consultantResumeHydrateSeqRef = useRef(0);

  useDraftIntakeVersionsEffect({
    isClientSelfServe: params.isClientSelfServe,
    draftAuditId: params.draftAuditId,
    setDraftIntakeVersions: params.setDraftIntakeVersions,
  });

  useDraftAutosaveEffect({
    persistNewAuditDraft: params.isClientSelfServe
      ? 'portal'
      : params.resumeDraftAuditIdFromQuery && !params.resumeDraftQueryHydrateComplete
        ? 'none'
        : 'consultant',
    step: params.step,
    url: params.url,
    noPublicWebsite: params.noPublicWebsite,
    name: params.name,
    industry: params.industry,
    industrySpecify: params.industrySpecify,
    briefProductMode: params.briefProductMode,
    responses: params.responses,
    briefLayoutChoice: params.briefLayoutChoice,
    draftAuditId: params.draftAuditId,
    draftIntakeVersions: params.draftIntakeVersions,
    coveragePackage: params.coveragePackage,
    selectedDomains: params.selectedDomains,
  });

  useEffect(() => {
    if (params.isClientSelfServe || !params.resumeDraftAuditIdFromQuery) return;

    consultantResumeHydrateSeqRef.current += 1;
    const hydrateSeq = consultantResumeHydrateSeqRef.current;
    let cancelled = false;
    params.setLoading(true);
    params.setError(null);

    void (async () => {
      try {
        const audit = await api.getAudit(params.resumeDraftAuditIdFromQuery);
        if (cancelled || hydrateSeq !== consultantResumeHydrateSeqRef.current) return;
        if (audit.meta.status !== 'created') {
          params.navigate({ pathname: APP_ROUTE_PATHS.auditNew, search: '' }, { replace: true });
          return;
        }
        const layoutStored = resolveConsultantBriefLayout(audit.meta.id);
        const resolvedBriefLayout =
          layoutStored === BRIEF_LAYOUT_WIZARD_CONST
            ? BRIEF_LAYOUT_WIZARD_CONST
            : layoutStored === BRIEF_LAYOUT_CLASSIC_CONST
              ? BRIEF_LAYOUT_CLASSIC_CONST
              : BRIEF_LAYOUT_UNSET_CONST;
        const boot = bootstrapConsultantNewAuditWizardFromAuditState({
          audit,
          resolvedBriefLayout,
        });
        params.setDraftAuditId(boot.draftAuditId);
        params.setUrl(boot.url);
        params.setNoPublicWebsite(boot.noPublicWebsite);
        params.setName(boot.name);
        params.setIndustry(boot.industry);
        params.setIndustrySpecify(boot.industrySpecify);
        params.setResponses(boot.responses);
        params.setDraftIntakeVersions(boot.draftIntakeVersions);
        params.setCoveragePackage(boot.coveragePackage);
        params.setSelectedDomains(boot.selectedDomains);
        params.setBriefTailoredPhaseUnlocked(boot.briefTailoredPhaseUnlocked);
        params.setBriefLayoutChoice(boot.briefLayoutChoice);
        params.setInterviewMode(boot.interviewMode);
        params.setStep(boot.step);
        params.setBasicsSubStep(boot.basicsSubStep);
        params.setDraftRestoredVisible(true);
        params.setResumeDraftQueryHydrateComplete(true);
        params.navigate({ pathname: APP_ROUTE_PATHS.auditNew, search: '' }, { replace: true });
      } catch (e) {
        if (cancelled || hydrateSeq !== consultantResumeHydrateSeqRef.current) return;
        params.setError(e instanceof ApiError ? e.message : WORKSPACE_PAGE_COPY.newAudit.resumeDraftAuditLoadFailed);
        params.navigate({ pathname: APP_ROUTE_PATHS.auditNew, search: '' }, { replace: true });
      } finally {
        if (!cancelled && hydrateSeq === consultantResumeHydrateSeqRef.current) {
          params.setLoading(false);
          params.setResumeDraftQueryHydrateComplete(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    params,
  ]);
}
