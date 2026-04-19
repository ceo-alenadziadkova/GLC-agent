import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { api, ApiError } from '../../data/apiService';
import { GLC_LEGAL_CONSENTS_UPDATED_WINDOW_EVENT, LEGAL_CONSENT_KEYS } from '../../config/legal-consent-client-policy';
import { useIntakeBankMetrics } from '../../hooks/useIntakeWizard';
import { WORKSPACE_PAGE_COPY } from '../../config/workspace-page-copy';
import {
  readClientPortalNewAuditDraft,
  type ClientPortalNewAuditDraftV1,
} from '../../lib/client-portal-new-audit-draft';
import type { BriefIntakeAnalyticsSurface } from '../../lib/brief-intake-analytics';
import type {
  IntakeVersionTuple,
} from '../../data/auditTypes';
import {
  INTAKE_BRIEF_SLA_PRODUCT_MODE,
} from '../../data/auditTypes';
import type { BriefResponses } from '../../data/briefQuestions';
import { computeNewAuditWizardProgress, validateNewAuditStep0Input } from './newAuditValidation';
import { launchNewAudit, saveClientDraft } from './newAuditExecution';
import {
  buildExecutionPlan,
} from './wizard-services/execution-plan.builder';
import { useCoverageSelectionState } from './wizard-state/useCoverageSelectionState';
import { useBriefLayoutState } from './wizard-state/useBriefLayoutState';
import { usePreBriefState } from './wizard-state/usePreBriefState';
import { useDraftAutosaveEffect } from './wizard-effects/useDraftAutosaveEffect';
import { useDraftIntakeVersionsEffect } from './wizard-effects/useDraftIntakeVersionsEffect';
import { useWizardPrefillEffects } from './wizard-effects/useWizardPrefillEffects';
import { resolveResponseSource } from './wizard-services/response-source.resolver';
import { createPreBriefToken, validatePreBriefInput } from './wizard-services/prebrief-token.service';
import { BRIEF_LAYOUT_WIZARD as BRIEF_LAYOUT_WIZARD_CONST, NEW_AUDIT_WIZARD_STEPS } from './wizard-config/wizard-constants';
import type { NewAuditVariant, NewAuditWizardContract } from './wizard-contract/useNewAuditWizard.types';

export type { NewAuditVariant } from './wizard-contract/useNewAuditWizard.types';

export function useNewAuditWizard(props?: { variant?: NewAuditVariant }): NewAuditWizardContract {
  const variant = props?.variant ?? 'consultant';
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const intakeTokenFromUrl = searchParams.get('intake')?.trim() ?? '';
  const fromDiscovery = searchParams.get('from_discovery') ?? '';
  const isClientSelfServe = variant === 'client_self_serve';

  const [portalDraftSeed] = useState<ClientPortalNewAuditDraftV1 | null>(() =>
    variant === 'client_self_serve' ? readClientPortalNewAuditDraft() : null,
  );

  // Step 1 fields
  const [url, setUrl] = useState(() => portalDraftSeed?.url ?? '');
  const [noPublicWebsite, setNoPublicWebsite] = useState(() => portalDraftSeed?.noPublicWebsite ?? false);
  const [name, setName] = useState(() => portalDraftSeed?.name ?? '');
  const [industry, setIndustry] = useState(() => portalDraftSeed?.industry ?? '');
  const [industrySpecify, setIndustrySpecify] = useState(() => portalDraftSeed?.industrySpecify ?? '');

  const briefProductMode: 'express' | 'full' = INTAKE_BRIEF_SLA_PRODUCT_MODE as 'express' | 'full';

  const {
    coveragePackage,
    setCoveragePackage,
    selectedDomains,
    setSelectedDomains,
    recommendedDomains,
    toggleDomainSelection,
  } = useCoverageSelectionState({ industry });

  // Step 2 fields
  const [responses, setResponses] = useState<BriefResponses>(() => portalDraftSeed?.responses ?? {});
  const [intakePrefillActive, setIntakePrefillActive] = useState(false);
  const [discoveryPrefilled, setDiscoveryPrefilled] = useState(false);

  const preBriefState = usePreBriefState();

  // Interview mode — consultant fills the brief during a live call
  const [interviewMode, setInterviewMode] = useState(false);

  const {
    briefLayoutChoice,
    setBriefLayoutChoice,
    layoutSelected,
    handleSelectConsultantBriefLayout,
    handleChangeConsultantBriefLayout,
  } = useBriefLayoutState({
    isClientSelfServe,
    seededChoice: portalDraftSeed?.briefLayoutChoice ?? null,
  });

  // UI state
  const [step, setStep] = useState<0 | 1 | 2>(() => {
    const s = portalDraftSeed?.step ?? 0;
    return s >= NEW_AUDIT_WIZARD_STEPS.min && s <= NEW_AUDIT_WIZARD_STEPS.max ? s : 0;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [consultantDpaLoading, setConsultantDpaLoading] = useState(() => !isClientSelfServe);
  const [consultantDpaOnFile, setConsultantDpaOnFile] = useState(false);
  const [consultantDpaChecked, setConsultantDpaChecked] = useState(false);

  // Client draft
  const [draftAuditId, setDraftAuditId] = useState<string | null>(() => portalDraftSeed?.draftAuditId ?? null);
  const [draftIntakeVersions, setDraftIntakeVersions] = useState<IntakeVersionTuple | null>(
    () => portalDraftSeed?.draftIntakeVersions ?? null,
  );
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftRestoredVisible, setDraftRestoredVisible] = useState(() => Boolean(portalDraftSeed));

  useEffect(() => {
    if (isClientSelfServe) {
      setConsultantDpaLoading(false);
      setConsultantDpaOnFile(false);
      return;
    }
    if (!user?.id) {
      setConsultantDpaLoading(true);
      return;
    }
    let cancelled = false;
    setConsultantDpaLoading(true);
    void api
      .getLegalConsents()
      .then(body => {
        if (cancelled) return;
        const row = body.effective.find(r => r.consent_key === LEGAL_CONSENT_KEYS.dpaAcceptance);
        setConsultantDpaOnFile(row?.accepted === true);
      })
      .catch(() => {
        if (!cancelled) setConsultantDpaOnFile(false);
      })
      .finally(() => {
        if (!cancelled) setConsultantDpaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isClientSelfServe, user?.id]);

  useWizardPrefillEffects({
    intakeTokenFromUrl,
    fromDiscovery,
    isClientSelfServe,
    setResponses,
    setIntakePrefillActive,
    setNoPublicWebsite,
    setUrl,
    setName,
    setIndustry,
    setIndustrySpecify,
    setDiscoveryPrefilled,
  });

  useDraftIntakeVersionsEffect({
    isClientSelfServe,
    draftAuditId,
    setDraftIntakeVersions,
  });

  useDraftAutosaveEffect({
    isClientSelfServe,
    step: step as 0 | 1 | 2,
    url,
    noPublicWebsite,
    name,
    industry,
    industrySpecify,
    briefProductMode,
    responses,
    briefLayoutChoice,
    draftAuditId: draftAuditId,
    draftIntakeVersions: draftIntakeVersions,
  });

  // Validation + progress
  const { step0Valid } = useMemo(
    () =>
      validateNewAuditStep0Input({
        url,
        noPublicWebsite,
        industry,
        industrySpecify,
        selectedDomains,
        coveragePackage,
      }),
    [url, noPublicWebsite, industry, industrySpecify, selectedDomains, coveragePackage],
  );

  const {
    answeredRequired,
    pipelineRequiredTotal,
    step2Complete,
    progressPct,
    readinessBadge,
    nextBestAction,
  } = useMemo(
    () =>
      computeNewAuditWizardProgress({
        responses,
        noPublicWebsite,
        briefProductMode,
      }),
    [responses, noPublicWebsite, briefProductMode],
  );

  const bankMetrics = useIntakeBankMetrics(
    responses,
    noPublicWebsite ? 'discovery' : undefined,
    noPublicWebsite ? undefined : 'consultant_interview',
    briefProductMode,
  );

  const briefWizardIntakeAnalytics = useMemo(():
    | {
        auditId: string;
        surface: BriefIntakeAnalyticsSurface;
        getIntakeVersions: () => IntakeVersionTuple | null;
      }
    | undefined => {
    if (!draftAuditId || noPublicWebsite || briefLayoutChoice !== BRIEF_LAYOUT_WIZARD_CONST) return undefined;
    const surface: BriefIntakeAnalyticsSurface = isClientSelfServe ? 'client_form' : 'consultant_interview';
    return {
      auditId: draftAuditId,
      surface,
      getIntakeVersions: (): IntakeVersionTuple | null => draftIntakeVersions,
    };
  }, [draftAuditId, noPublicWebsite, briefLayoutChoice, isClientSelfServe, draftIntakeVersions]);

  const responseSource = resolveResponseSource({ isClientSelfServe, interviewMode });

  function handleResponseChange(id: string, value: string | string[] | number | null) {
    setResponses(prev => ({ ...prev, [id]: { value, source: responseSource } }));
  }

  function handleSetUnknown(id: string) {
    setResponses(prev => ({ ...prev, [id]: { value: null, source: 'unknown' } }));
  }

  async function handleSaveClientDraft() {
    const executionPlan = buildExecutionPlan({
      coveragePackage,
      selectedDomains,
      recommendedDomains,
    });
    await saveClientDraft({
      isClientSelfServe,
      step0Valid,
      step: step as 0 | 1 | 2,
      url,
      noPublicWebsite,
      name,
      industry,
      industrySpecify,
      productMode: briefProductMode,
      responses,
      briefLayoutChoice,
      executionPlan,
      draftAuditId,
      draftIntakeVersions,
      setDraftAuditId,
      setDraftIntakeVersions,
      setDraftNotice,
      setDraftError,
      setDraftSaving,
    });
  }

  const handleLaunch = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!isClientSelfServe) {
        if (consultantDpaLoading) return;
        if (!consultantDpaOnFile) {
          if (!consultantDpaChecked) {
            setError(WORKSPACE_PAGE_COPY.newAudit.step2.dpaConsultantRequired);
            return;
          }
          setLoading(true);
          setError(null);
          try {
            await api.postLegalConsents({
              source: 'audit_create',
              events: [{ consent_key: LEGAL_CONSENT_KEYS.dpaAcceptance, accepted: true }],
            });
            window.dispatchEvent(new Event(GLC_LEGAL_CONSENTS_UPDATED_WINDOW_EVENT));
            setConsultantDpaOnFile(true);
            setConsultantDpaChecked(false);
          } catch (err) {
            setLoading(false);
            setError(
              err instanceof ApiError ? err.message : WORKSPACE_PAGE_COPY.newAudit.step2.dpaConsultantSaveFailed,
            );
            return;
          }
          setLoading(false);
        }
      }

      const executionPlan = buildExecutionPlan({
        coveragePackage,
        selectedDomains,
        recommendedDomains,
      });
      return launchNewAudit(e, {
        isClientSelfServe,
        url,
        noPublicWebsite,
        name,
        industry,
        industrySpecify,
        productMode: briefProductMode,
        responses,
        briefLayoutChoice,
        executionPlan,
        draftAuditId,
        preBriefToken: preBriefState.preBriefToken,
        intakeTokenFromUrl,
        setError,
        setLoading,
        navigate,
        setPreBriefToken: preBriefState.setPreBriefToken,
        setDraftIntakeVersions,
      });
    },
    [
      briefLayoutChoice,
      briefProductMode,
      consultantDpaChecked,
      consultantDpaLoading,
      consultantDpaOnFile,
      coveragePackage,
      draftAuditId,
      industry,
      industrySpecify,
      intakeTokenFromUrl,
      isClientSelfServe,
      name,
      navigate,
      noPublicWebsite,
      preBriefState.preBriefToken,
      preBriefState.setPreBriefToken,
      recommendedDomains,
      responses,
      selectedDomains,
      url,
    ],
  );

  async function handlePreBriefCreate() {
    preBriefState.setPreBriefErr(null);
    preBriefState.setPreBriefLoading(true);
    preBriefState.setPreBriefLink(null);
    try {
      const validation = validatePreBriefInput({
        company: preBriefState.preBriefCompany,
        website: preBriefState.preBriefWebsite,
        industryField: preBriefState.preBriefIndustryField,
        industrySpecify: preBriefState.preBriefIndustrySpecify,
        message: preBriefState.preBriefMessage,
        consultantName: preBriefState.preBriefConsultantName,
        expectedContact: preBriefState.preBriefExpectedContact,
        contactChannel: preBriefState.preBriefContactChannel,
        email: preBriefState.preBriefEmail,
        whatsapp: preBriefState.preBriefWhatsapp,
      });
      if (validation.hasError) {
        preBriefState.setPreBriefErr(WORKSPACE_PAGE_COPY.newAudit.preBriefIndustryOtherRequired);
        preBriefState.setPreBriefLoading(false);
        return;
      }
      const { url: link, token } = await createPreBriefToken({
        user,
        draft: {
          company: preBriefState.preBriefCompany,
          website: preBriefState.preBriefWebsite,
          industryField: preBriefState.preBriefIndustryField,
          industrySpecify: preBriefState.preBriefIndustrySpecify,
          message: preBriefState.preBriefMessage,
          consultantName: preBriefState.preBriefConsultantName,
          expectedContact: preBriefState.preBriefExpectedContact,
          contactChannel: preBriefState.preBriefContactChannel,
          email: preBriefState.preBriefEmail,
          whatsapp: preBriefState.preBriefWhatsapp,
        },
      });
      preBriefState.setPreBriefLink(link);
      preBriefState.setPreBriefToken(token);
    } catch (e) {
      preBriefState.setPreBriefErr((e as Error).message);
    } finally {
      preBriefState.setPreBriefLoading(false);
    }
  }

  return {
    // Props derived
    isClientSelfServe,

    // Query-driven
    intakeTokenFromUrl,
    fromDiscovery,

    // Step & UI feedback
    step,
    setStep,
    loading,
    setLoading,
    error,
    setError,
    step0Valid,
    briefProductMode,

    // Step 0 basics
    url,
    setUrl,
    noPublicWebsite,
    setNoPublicWebsite,
    name,
    setName,
    industry,
    setIndustry,
    industrySpecify,
    setIndustrySpecify,
    coveragePackage,
    setCoveragePackage,
    selectedDomains,
    setSelectedDomains,
    toggleDomainSelection,
    recommendedDomains,

    // Step 1 brief
    responses,
    setResponses,
    intakePrefillActive,
    discoveryPrefilled,
    answeredRequired,
    pipelineRequiredTotal,
    step2Complete,
    progressPct,
    readinessBadge,
    nextBestAction,
    bankMetrics,

    // Layout / gating UI
    briefLayoutChoice,
    setBriefLayoutChoice,
    layoutSelected,
    handleSelectConsultantBriefLayout,
    handleChangeConsultantBriefLayout,
    briefWizardIntakeAnalytics,

    // Interview mode
    interviewMode,
    setInterviewMode,

    // Response handlers
    handleResponseChange,
    handleSetUnknown,

    // Draft state
    draftAuditId,
    draftIntakeVersions,
    setDraftIntakeVersions,
    draftSaving,
    draftNotice,
    setDraftNotice,
    draftError,
    setDraftError,
    setDraftSaving,
    setDraftAuditId,
    draftRestoredVisible,
    setDraftRestoredVisible,

    // Actions
    handleSaveClientDraft,
    handleLaunch,

    consultantDpaLoading,
    consultantDpaOnFile,
    consultantDpaChecked,
    setConsultantDpaChecked,

    // Pre-brief modal
    preBriefOpen: preBriefState.preBriefOpen,
    setPreBriefOpen: preBriefState.setPreBriefOpen,
    preBriefCompany: preBriefState.preBriefCompany,
    setPreBriefCompany: preBriefState.setPreBriefCompany,
    preBriefWebsite: preBriefState.preBriefWebsite,
    setPreBriefWebsite: preBriefState.setPreBriefWebsite,
    preBriefIndustryField: preBriefState.preBriefIndustryField,
    setPreBriefIndustryField: preBriefState.setPreBriefIndustryField,
    preBriefIndustrySpecify: preBriefState.preBriefIndustrySpecify,
    setPreBriefIndustrySpecify: preBriefState.setPreBriefIndustrySpecify,
    preBriefMessage: preBriefState.preBriefMessage,
    setPreBriefMessage: preBriefState.setPreBriefMessage,
    preBriefConsultantName: preBriefState.preBriefConsultantName,
    setPreBriefConsultantName: preBriefState.setPreBriefConsultantName,
    preBriefExpectedContact: preBriefState.preBriefExpectedContact,
    setPreBriefExpectedContact: preBriefState.setPreBriefExpectedContact,
    preBriefContactChannel: preBriefState.preBriefContactChannel,
    setPreBriefContactChannel: preBriefState.setPreBriefContactChannel,
    preBriefEmail: preBriefState.preBriefEmail,
    setPreBriefEmail: preBriefState.setPreBriefEmail,
    preBriefWhatsapp: preBriefState.preBriefWhatsapp,
    setPreBriefWhatsapp: preBriefState.setPreBriefWhatsapp,
    preBriefLink: preBriefState.preBriefLink,
    setPreBriefLink: preBriefState.setPreBriefLink,
    preBriefToken: preBriefState.preBriefToken,
    setPreBriefToken: preBriefState.setPreBriefToken,
    preBriefLoading: preBriefState.preBriefLoading,
    setPreBriefLoading: preBriefState.setPreBriefLoading,
    preBriefErr: preBriefState.preBriefErr,
    setPreBriefErr: preBriefState.setPreBriefErr,
    closePreBriefModal: preBriefState.closePreBriefModal,
    handlePreBriefCreate,
    responseSource,
  };
}

