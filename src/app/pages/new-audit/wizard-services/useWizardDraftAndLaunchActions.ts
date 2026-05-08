import { useCallback } from 'react';
import type { FormEvent } from 'react';
import { api, ApiError } from '../../../data/apiService';
import type { AuditCoveragePackage, DomainKey, IntakeVersionTuple } from '../../../data/auditTypes';
import type { BriefResponses } from '../../../data/briefQuestions';
import { buildExecutionPlan } from './execution-plan.builder';
import { launchNewAudit, saveClientDraft } from '../newAuditExecution';

export function useWizardDraftAndLaunchActions(params: {
  isClientSelfServe: boolean;
  step0Valid: boolean;
  step: 0 | 1 | 2 | 3;
  url: string;
  noPublicWebsite: boolean;
  name: string;
  industry: string;
  industrySpecify: string;
  briefProductMode: 'express' | 'full';
  responses: BriefResponses;
  briefLayoutChoice: 'unset' | 'classic' | 'wizard';
  coveragePackage: AuditCoveragePackage | null;
  selectedDomains: DomainKey[];
  recommendedDomains: DomainKey[];
  draftAuditId: string | null;
  draftIntakeVersions: IntakeVersionTuple | null;
  setDraftAuditId: (value: string | null) => void;
  setDraftIntakeVersions: (value: IntakeVersionTuple | null) => void;
  setDraftNotice: (value: string | null) => void;
  setDraftError: (value: string | null) => void;
  setDraftSaving: (value: boolean) => void;
  setError: (value: string | null) => void;
  setLoading: (value: boolean) => void;
  intakeTokenFromUrl: string;
  preBriefToken: string | null;
  setPreBriefToken: (value: string | null) => void;
  navigate: (path: string) => void;
  useBasicsSiteScanSplit: boolean;
  setStep: (value: 0 | 1 | 2 | 3) => void;
  setBasicsSubStep: (value: 0 | 1) => void;
  ensureConsultantDpaAccepted: () => Promise<boolean>;
}) {
  const handleSaveClientDraft = useCallback(async () => {
    const executionPlan = buildExecutionPlan({
      coveragePackage: params.coveragePackage,
      selectedDomains: params.selectedDomains,
      recommendedDomains: params.recommendedDomains,
    });
    await saveClientDraft({
      isClientSelfServe: params.isClientSelfServe,
      step0Valid: params.step0Valid,
      step: params.step,
      url: params.url,
      noPublicWebsite: params.noPublicWebsite,
      name: params.name,
      industry: params.industry,
      industrySpecify: params.industrySpecify,
      productMode: params.briefProductMode,
      responses: params.responses,
      briefLayoutChoice: params.briefLayoutChoice,
      coveragePackage: params.coveragePackage,
      selectedDomains: params.selectedDomains,
      executionPlan,
      draftAuditId: params.draftAuditId,
      draftIntakeVersions: params.draftIntakeVersions,
      setDraftAuditId: params.setDraftAuditId,
      setDraftIntakeVersions: params.setDraftIntakeVersions,
      setDraftNotice: params.setDraftNotice,
      setDraftError: params.setDraftError,
      setDraftSaving: params.setDraftSaving,
    });
  }, [params]);

  const handleLaunch = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (params.coveragePackage == null) return;
      if (!(await params.ensureConsultantDpaAccepted())) return;
      const executionPlan = buildExecutionPlan({
        coveragePackage: params.coveragePackage as never,
        selectedDomains: params.selectedDomains as never[],
        recommendedDomains: params.recommendedDomains as never[],
      });
      return launchNewAudit(e, {
        isClientSelfServe: params.isClientSelfServe,
        url: params.url,
        noPublicWebsite: params.noPublicWebsite,
        name: params.name,
        industry: params.industry,
        industrySpecify: params.industrySpecify,
        productMode: params.briefProductMode,
        responses: params.responses,
        briefLayoutChoice: params.briefLayoutChoice,
        executionPlan,
        draftAuditId: params.draftAuditId,
        preBriefToken: params.preBriefToken,
        intakeTokenFromUrl: params.intakeTokenFromUrl,
        setError: params.setError,
        setLoading: params.setLoading,
        navigate: params.navigate,
        setPreBriefToken: params.setPreBriefToken,
        setDraftIntakeVersions: params.setDraftIntakeVersions,
      });
    },
    [params],
  );

  const handleStep0ContinueFromBasics = useCallback(async () => {
    if (!params.step0Valid) return;
    if (params.coveragePackage == null) return;
    if (!(await params.ensureConsultantDpaAccepted())) return;

    const executionPlan = buildExecutionPlan({
      coveragePackage: params.coveragePackage,
      selectedDomains: params.selectedDomains,
      recommendedDomains: params.recommendedDomains,
    });

    try {
      params.setLoading(true);
      params.setError(null);
      if (!params.draftAuditId) {
        const audit = await api.createAudit(
          params.url,
          params.name || undefined,
          params.industry || undefined,
          params.briefProductMode,
          { noPublicWebsite: params.noPublicWebsite, executionPlan },
        );
        params.setDraftAuditId(audit.id);
      }
      if (params.useBasicsSiteScanSplit) {
        params.setBasicsSubStep(1);
      } else {
        params.setStep(1);
      }
    } catch (err) {
      params.setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      params.setLoading(false);
    }
  }, [params]);

  return {
    handleSaveClientDraft,
    handleLaunch,
    handleStep0ContinueFromBasics,
  };
}
