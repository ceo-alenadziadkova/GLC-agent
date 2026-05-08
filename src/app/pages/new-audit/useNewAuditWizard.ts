import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BriefSchemaSnapshot } from '../../data/api/brief-profile-platform';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { useIntakeBankMetrics } from '../../hooks/useIntakeWizard';
import {
  areEarlyBriefCaptureSlotsSatisfied,
  arePreBriefSubmitSlotsSatisfied,
  currentIntakeVersionTuple,
  type IntakeSurface,
} from '@glc/intake-core';
import { briefResponsesToIntakeMap } from '../../data/intakeBriefMap';
import { APP_FEATURE_FLAGS } from '../../config/app-feature-flags';
import {
  readClientPortalNewAuditDraft,
  readConsultantNewAuditDraft,
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
import {
  newAuditStep1CollectionMode,
} from './newAuditValidation';
import type {
  AuditBriefIntelligenceSnapshotResponse,
  AuditBriefIntelligenceWordingResponse,
} from '../../data/api/brief-profile-platform';

const EMPTY_INTELLIGENCE_WORDING_UI: Pick<
  AuditBriefIntelligenceWordingResponse,
  'label_overrides' | 'hint_overrides' | 'option_display_overrides'
> = {
  label_overrides: {},
  hint_overrides: {},
  option_display_overrides: {},
};
import { useCoverageSelectionState } from './wizard-state/useCoverageSelectionState';
import { useBriefLayoutState } from './wizard-state/useBriefLayoutState';
import { usePreBriefState } from './wizard-state/usePreBriefState';
import { useWizardDiscoveryPrefill } from './wizard-effects/useWizardDiscoveryPrefill';
import { resolveResponseSource } from './wizard-services/response-source.resolver';
import {
  BRIEF_LAYOUT_WIZARD as BRIEF_LAYOUT_WIZARD_CONST,
} from './wizard-config/wizard-constants';
import type { NewAuditVariant, NewAuditWizardContract } from './wizard-contract/useNewAuditWizard.types';
import {
  NEW_AUDIT_RESUME_DRAFT_AUDIT_QUERY,
} from '../../config/route-paths';
import { useWizardStepState } from './wizard-state/useWizardStepState';
import { useWizardValidationProgress } from './wizard-state/useWizardValidationProgress';
import { useConsultantDpaConsent } from './wizard-services/useConsultantDpaConsent';
import { useWizardDraftAndLaunchActions } from './wizard-services/useWizardDraftAndLaunchActions';
import { useWizardSnapshotStateMachine } from './state-machine/useWizardSnapshotStateMachine';
import { shouldOpenSnapshotGate } from './validators/newAuditWizardGuards';
import { useWizardDraftPersistence } from './draft/useWizardDraftPersistence';
import { useNewAuditF1SyncEffect } from './effects/useNewAuditF1SyncEffect';
import { useNewAuditBriefDiagnosticsEffect } from './effects/useNewAuditBriefDiagnosticsEffect';
import { useNewAuditSnapshotActions } from './effects/useNewAuditSnapshotActions';
import { useNewAuditResponseHandlers } from './effects/useNewAuditResponseHandlers';
import { useNewAuditPreBriefActions } from './effects/useNewAuditPreBriefActions';
import {
  getBriefTailoredFollowUpUnlocked,
  getBriefWizardIntakeAnalytics,
  getEarlyIntelligenceEligible,
  getNewAuditBankIntakeSurface,
  getNewAuditCollectionModeForPlan,
} from './mappers/newAuditWizardMappers';

export type { NewAuditVariant } from './wizard-contract/useNewAuditWizard.types';

export function shouldRunNewAuditSnapshotGate(args: {
  snapshotStepEnabled: boolean;
  isClientSelfServe: boolean;
  hasDraftAuditId: boolean;
  briefIntelligenceSubStep: 'short_brief' | 'snapshot_confirm';
  intakePrefillActive: boolean;
}): boolean {
  if (!args.snapshotStepEnabled) return false;
  return shouldOpenSnapshotGate({
    isClientSelfServe: args.isClientSelfServe,
    draftAuditId: args.hasDraftAuditId ? 'draft' : null,
    briefIntelligenceSubStep: args.briefIntelligenceSubStep,
    intakePrefillActive: args.intakePrefillActive,
  });
}

export function useNewAuditWizard(props?: { variant?: NewAuditVariant }): NewAuditWizardContract {
  const variant = props?.variant ?? 'consultant';
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const intakeTokenFromUrl = searchParams.get('intake')?.trim() ?? '';
  const fromDiscovery = searchParams.get('from_discovery') ?? '';
  const isClientSelfServe = variant === 'client_self_serve';
  const resumeDraftAuditIdFromQuery = !isClientSelfServe
    ? (searchParams.get(NEW_AUDIT_RESUME_DRAFT_AUDIT_QUERY)?.trim() ?? '')
    : '';
  const [resumeDraftQueryHydrateComplete, setResumeDraftQueryHydrateComplete] = useState(
    () => resumeDraftAuditIdFromQuery === '',
  );

  const [newAuditDraftSeed] = useState<ClientPortalNewAuditDraftV1 | null>(() =>
    variant === 'client_self_serve'
      ? readClientPortalNewAuditDraft()
      : variant === 'consultant'
        ? readConsultantNewAuditDraft()
        : null,
  );

  // Step 1 fields
  const [url, setUrl] = useState(() => newAuditDraftSeed?.url ?? '');
  const [noPublicWebsite, setNoPublicWebsite] = useState(() => newAuditDraftSeed?.noPublicWebsite ?? false);
  const [name, setName] = useState(() => newAuditDraftSeed?.name ?? '');
  const [industry, setIndustry] = useState(() => newAuditDraftSeed?.industry ?? '');
  const [industrySpecify, setIndustrySpecify] = useState(() => newAuditDraftSeed?.industrySpecify ?? '');

  const briefProductMode: 'express' | 'full' = INTAKE_BRIEF_SLA_PRODUCT_MODE as 'express' | 'full';

  const {
    coveragePackage,
    setCoveragePackage,
    selectedDomains,
    setSelectedDomains,
    recommendedDomains,
    toggleDomainSelection,
  } = useCoverageSelectionState({
    industry,
    isClientSelfServe,
    seedCoveragePackage: newAuditDraftSeed?.coveragePackage,
    seedSelectedDomains: newAuditDraftSeed?.selectedDomains,
  });

  // Step 2 fields
  const [responses, setResponses] = useState<BriefResponses>(() => newAuditDraftSeed?.responses ?? {});
  const [intakePrefillActive, setIntakePrefillActive] = useState(false);
  const [discoveryPrefilled, setDiscoveryPrefilled] = useState(false);

  const preBriefState = usePreBriefState();

  // Interview mode — consultant fills the brief during a live call
  const [interviewMode, setInterviewMode] = useState(false);
  const responseSource = resolveResponseSource({ isClientSelfServe, interviewMode });

  const {
    briefLayoutChoice,
    setBriefLayoutChoice,
    layoutSelected,
    handleSelectConsultantBriefLayout,
    handleChangeConsultantBriefLayout,
  } = useBriefLayoutState({
    isClientSelfServe,
    seededChoice: newAuditDraftSeed?.briefLayoutChoice ?? null,
  });

  // UI state
  const {
    step,
    setStep,
    basicsSubStep,
    setBasicsSubStep,
    useBasicsSiteScanSplit,
    visualWizardIndex,
    stepIndicatorVariant,
    handleWizardStepIndicatorClick,
    handleSiteCheckContinueToBrief,
    handleSiteCheckBackToBasicsForm,
  } = useWizardStepState({
    seedStep: newAuditDraftSeed?.step,
    noPublicWebsite,
    url,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Consultant: optional intelligence snapshot sub-step (same contract as public intake, bank+F2). */
  const [briefIntelligenceSubStep, setBriefIntelligenceSubStep] = useState<'short_brief' | 'snapshot_confirm'>(
    'short_brief',
  );
  /** `early` uses identity-only snapshot before the short-brief portrait is finished. */
  const [intelligenceSnapshotPhase, setIntelligenceSnapshotPhase] = useState<'standard' | 'early'>('standard');
  const [intelEarlyMergePending, setIntelEarlyMergePending] = useState(false);
  const [intelligenceSnapshotResult, setIntelligenceSnapshotResult] =
    useState<AuditBriefIntelligenceSnapshotResponse | null>(null);
  const [intelligenceSnapshotError, setIntelligenceSnapshotError] = useState<string | null>(null);
  const [intelligenceSnapshotLoading, setIntelligenceSnapshotLoading] = useState(false);
  const [intelligenceLlm1Done, setIntelligenceLlm1Done] = useState(false);
  /** After Save + wording (or equivalent), show full bank / planner follow-ups — not only pre_brief slice. */
  const [briefTailoredPhaseUnlocked, setBriefTailoredPhaseUnlocked] = useState(false);
  const [intelligenceWordingUi, setIntelligenceWordingUi] = useState<
    Pick<
      AuditBriefIntelligenceWordingResponse,
      'label_overrides' | 'hint_overrides' | 'option_display_overrides'
    >
  >(() => ({ ...EMPTY_INTELLIGENCE_WORDING_UI }));
  const [intelligenceWordingLoading, setIntelligenceWordingLoading] = useState(false);
  const snapshotMachine = useWizardSnapshotStateMachine({
    setBriefIntelligenceSubStep,
    setIntelligenceSnapshotResult,
    setIntelligenceSnapshotError,
    setIntelligenceSnapshotPhase,
    setIntelligenceLlm1Done,
  });

  const {
    consultantDpaLoading,
    consultantDpaOnFile,
    consultantDpaChecked,
    setConsultantDpaChecked,
    ensureConsultantDpaAccepted,
  } = useConsultantDpaConsent({
    isClientSelfServe,
    userId: user?.id,
    setError,
    setLoading,
  });

  // Client draft
  const [draftAuditId, setDraftAuditId] = useState<string | null>(() => newAuditDraftSeed?.draftAuditId ?? null);
  const [draftIntakeVersions, setDraftIntakeVersions] = useState<IntakeVersionTuple | null>(
    () => newAuditDraftSeed?.draftIntakeVersions ?? null,
  );
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftRestoredVisible, setDraftRestoredVisible] = useState(() => Boolean(newAuditDraftSeed));
  const [clientProjectContextSyncTick, setClientProjectContextSyncTick] = useState(0);

  useEffect(() => {
    setIntelligenceLlm1Done(false);
    setIntelligenceWordingUi({ ...EMPTY_INTELLIGENCE_WORDING_UI });
    setIntelligenceSnapshotResult(null);
    setIntelligenceSnapshotError(null);
    setBriefIntelligenceSubStep('short_brief');
  }, [draftAuditId]);

  const [briefExecutionDiagnostic, setBriefExecutionDiagnostic] = useState<Pick<
    BriefSchemaSnapshot,
    'readiness' | 'critical_signals' | 'remediation_queue'
  > | null>(null);
  const [briefExecutionDiagnosticLoading, setBriefExecutionDiagnosticLoading] = useState(false);
  const [briefExecutionDiagnosticError, setBriefExecutionDiagnosticError] = useState(false);
  const [briefWizardServerVisibleQuestionIds, setBriefWizardServerVisibleQuestionIds] = useState<
    string[] | undefined
  >(undefined);

  const bumpClientProjectContextSyncTick = useCallback(() => {
    setClientProjectContextSyncTick(prev => prev + 1);
  }, []);

  useWizardDiscoveryPrefill({
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
  useWizardDraftPersistence({
    isClientSelfServe,
    resumeDraftAuditIdFromQuery,
    resumeDraftQueryHydrateComplete,
    setResumeDraftQueryHydrateComplete,
    navigate,
    setLoading,
    setError,
    draftAuditId,
    setDraftAuditId,
    setUrl,
    setNoPublicWebsite,
    setName,
    setIndustry,
    setIndustrySpecify,
    setResponses,
    setDraftIntakeVersions,
    setCoveragePackage,
    setSelectedDomains,
    setBriefTailoredPhaseUnlocked,
    setBriefLayoutChoice,
    setInterviewMode,
    setStep,
    setBasicsSubStep,
    setDraftRestoredVisible,
    step,
    url,
    noPublicWebsite,
    name,
    industry,
    industrySpecify,
    briefProductMode,
    responses,
    briefLayoutChoice,
    draftIntakeVersions,
    coveragePackage,
    selectedDomains,
  });

  /**
   * Full bank / planner tail after wording. Do **not** use `!useBasicsSiteScanSplit` alone for consultants:
   * empty URL makes site-split false and was incorrectly unlocking the full bank (~30+ questions) on step 1.
   * Portal self-serve without site sub-step still skips straight to full eligible set for that flow.
   */
  const briefTailoredFollowUpUnlocked = useMemo(
    () => getBriefTailoredFollowUpUnlocked({ briefTailoredPhaseUnlocked, intakePrefillActive }),
    [briefTailoredPhaseUnlocked, intakePrefillActive],
  );

  const {
    step0Valid,
    coverageValid,
    answeredRequired,
    pipelineRequiredTotal,
    step2Complete,
    progressPct,
    readinessBadge,
    nextBestAction,
    answeredPipelineRequiredIds,
    pipelineGateBriefResponses,
  } = useWizardValidationProgress({
    url,
    noPublicWebsite,
    name,
    industry,
    industrySpecify,
    selectedDomains,
    coveragePackage,
    responses,
    briefProductMode,
    responseSource,
    isClientSelfServe,
    draftIntakeVersions,
    briefTailoredFollowUpUnlocked,
  });

  const intakeMapForSnapshots = useMemo(
    () => briefResponsesToIntakeMap(pipelineGateBriefResponses) as Record<string, unknown>,
    [pipelineGateBriefResponses],
  );

  const earlyIntelligenceEligible = useMemo(
    () =>
      getEarlyIntelligenceEligible({
        noPublicWebsite,
        isClientSelfServe,
        draftAuditId,
        intakePrefillActive,
        briefTailoredFollowUpUnlocked,
        intakeMapForSnapshots,
      }),
    [
      briefTailoredFollowUpUnlocked,
      draftAuditId,
      intakeMapForSnapshots,
      intakePrefillActive,
      isClientSelfServe,
      noPublicWebsite,
    ],
  );

  /** Client portal (self-serve) must use `client_form` — was wrongly using consultant surface for metrics. */
  const newAuditBankIntakeSurface: IntakeSurface | undefined = useMemo(
    () => getNewAuditBankIntakeSurface({ noPublicWebsite, isClientSelfServe }),
    [isClientSelfServe, noPublicWebsite],
  );
  const newAuditCollectionModeForPlan = useMemo(
    () => getNewAuditCollectionModeForPlan({ noPublicWebsite, isClientSelfServe, briefTailoredFollowUpUnlocked }),
    [briefTailoredFollowUpUnlocked, isClientSelfServe, noPublicWebsite],
  );
  const bankMetrics = useIntakeBankMetrics(
    responses,
    newAuditCollectionModeForPlan,
    newAuditBankIntakeSurface,
    briefProductMode,
  );

  /** Public link token: `?intake=` or pre-brief generator — required for F1 (same host route as public intake). */
  const f1IntakeToken = useMemo(
    () => (intakeTokenFromUrl || preBriefState.preBriefToken || '').trim(),
    [intakeTokenFromUrl, preBriefState.preBriefToken],
  );

  useNewAuditF1SyncEffect({
    step,
    noPublicWebsite,
    briefLayoutChoice,
    f1IntakeToken,
    pipelineGateBriefResponses,
    isClientSelfServe,
    briefProductMode,
    draftIntakeVersions,
  });

  const briefWizardIntakeAnalytics = useMemo(
    () =>
      getBriefWizardIntakeAnalytics({
        draftAuditId,
        noPublicWebsite,
        briefLayoutChoice,
        isClientSelfServe,
        draftIntakeVersions,
      }),
    [draftAuditId, noPublicWebsite, briefLayoutChoice, isClientSelfServe, draftIntakeVersions],
  );

  const responsesFingerprint = useMemo(() => JSON.stringify(responses), [responses]);

  useNewAuditBriefDiagnosticsEffect({
    step,
    draftAuditId,
    noPublicWebsite,
    briefLayoutChoice,
    responsesFingerprint,
    setBriefExecutionDiagnostic,
    setBriefWizardServerVisibleQuestionIds,
    setBriefExecutionDiagnosticLoading,
    setBriefExecutionDiagnosticError,
  });

  const { handleResponseChange, handleSetUnknown, handleBriefCloneFromAudit } = useNewAuditResponseHandlers({
    responseSource,
    setResponses,
    draftAuditId,
    bumpClientProjectContextSyncTick,
  });

  const {
    runBriefIntelligenceSnapshot,
    runEarlyBriefIntelligenceSnapshot,
    retryBriefIntelligenceSnapshot,
    handleStep1ContinueToReview,
    handleIntelligenceSnapshotSkipToReview,
    handleIntelligenceSnapshotSaveApplyAndWording,
    handleIntelligenceSnapshotBackToBriefForm,
    handleBackFromStep2ToStep1,
    handleBackFromStep1ToStep0,
  } = useNewAuditSnapshotActions({
    draftAuditId,
    isClientSelfServe,
    url,
    noPublicWebsite,
    name,
    industry,
    industrySpecify,
    responses,
    responseSource,
    briefLayoutChoice,
    preBriefToken: preBriefState.preBriefToken,
    intakeTokenFromUrl,
    draftIntakeVersions,
    bumpClientProjectContextSyncTick,
    snapshotMachine,
    intelligenceSnapshotPhase,
    intelligenceSnapshotResult,
    briefIntelligenceSubStep,
    intakePrefillActive,
    intelligenceLlm1Done,
    step2Complete,
    setStep,
    setResponses,
    setDraftIntakeVersions,
    setIntelligenceSnapshotLoading,
    setIntelligenceSnapshotError,
    setIntelligenceSnapshotPhase,
    setIntelEarlyMergePending,
    setIntelligenceWordingLoading,
    setIntelligenceWordingUi,
    setBriefTailoredPhaseUnlocked,
    setBasicsSubStep,
  });

  const { handleSaveClientDraft, handleLaunch, handleStep0ContinueFromBasics } =
    useWizardDraftAndLaunchActions({
      isClientSelfServe,
      step0Valid,
      step: step as 0 | 1 | 2 | 3,
      url,
      noPublicWebsite,
      name,
      industry,
      industrySpecify,
      briefProductMode,
      responses,
      briefLayoutChoice,
      coveragePackage,
      selectedDomains,
      recommendedDomains,
      draftAuditId,
      draftIntakeVersions,
      setDraftAuditId,
      setDraftIntakeVersions,
      setDraftNotice,
      setDraftError,
      setDraftSaving,
      setError,
      setLoading,
      intakeTokenFromUrl,
      preBriefToken: preBriefState.preBriefToken,
      setPreBriefToken: preBriefState.setPreBriefToken,
      navigate,
      useBasicsSiteScanSplit,
      setStep,
      setBasicsSubStep,
      ensureConsultantDpaAccepted,
    });

  const handleWizardStepIndicatorClickWithReset = useCallback((visual: number) => {
    snapshotMachine.resetToShortBrief();
    handleWizardStepIndicatorClick(visual);
  }, [handleWizardStepIndicatorClick, snapshotMachine]);

  const { handlePreBriefCreate } = useNewAuditPreBriefActions({
    user,
    preBriefState,
  });

  return {
    // Props derived
    isClientSelfServe,

    // Query-driven
    intakeTokenFromUrl,
    fromDiscovery,

    // Step & UI feedback
    step,
    setStep,
    basicsSubStep,
    setBasicsSubStep,
    useBasicsSiteScanSplit,
    visualWizardIndex,
    stepIndicatorVariant,
    handleWizardStepIndicatorClick: handleWizardStepIndicatorClickWithReset,
    handleStep0ContinueFromBasics,
    handleSiteCheckContinueToBrief,
    handleSiteCheckBackToBasicsForm,
    loading,
    setLoading,
    error,
    setError,
    step0Valid,
    coverageValid,
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
    answeredPipelineRequiredIds,
    briefTailoredFollowUpUnlocked,
    pipelineGateBriefResponses,
    step2Complete,
    progressPct,
    readinessBadge,
    nextBestAction,
    briefExecutionDiagnostic,
    briefExecutionDiagnosticLoading,
    briefExecutionDiagnosticError,
    briefWizardServerVisibleQuestionIds,
    clientProjectContextSyncTick,
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
    briefIntelligenceSubStep,
    intelligenceSnapshotResult,
    intelligenceSnapshotError,
    intelligenceSnapshotLoading,
    intelligenceWordingUi,
    intelligenceWordingLoading,
    intelEarlyMergePending,
    intelligenceSnapshotPhase,
    earlyIntelligenceEligible,
    runEarlyBriefIntelligenceSnapshot,
    handleBriefCloneFromAudit,
    handleStep1ContinueToReview,
    handleIntelligenceSnapshotSaveApplyAndWording,
    handleIntelligenceSnapshotBackToBriefForm,
    handleIntelligenceSnapshotSkipToReview,
    runBriefIntelligenceSnapshot,
    retryBriefIntelligenceSnapshot,
    handleBackFromStep2ToStep1,
    handleBackFromStep1ToStep0,

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

