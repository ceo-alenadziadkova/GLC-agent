import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BriefSchemaSnapshot } from '../../data/api/brief-profile-platform';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../data/apiService';
import { useIntakeBankMetrics } from '../../hooks/useIntakeWizard';
import {
  areEarlyBriefCaptureSlotsSatisfied,
  arePreBriefSubmitSlotsSatisfied,
  currentIntakeVersionTuple,
  type IntakeSurface,
} from '@glc/intake-core';
import { briefResponsesToIntakeMap } from '../../data/intakeBriefMap';
import { APP_FEATURE_FLAGS } from '../../config/app-feature-flags';
import { WORKSPACE_PAGE_COPY } from '../../config/workspace-page-copy';
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
import { applyIntelligenceInferredSelections } from './apply-intelligence-inferred';
import { useCoverageSelectionState } from './wizard-state/useCoverageSelectionState';
import { useBriefLayoutState } from './wizard-state/useBriefLayoutState';
import { usePreBriefState } from './wizard-state/usePreBriefState';
import { useWizardDiscoveryPrefill } from './wizard-effects/useWizardDiscoveryPrefill';
import { resolveResponseSource } from './wizard-services/response-source.resolver';
import { createPreBriefToken, validatePreBriefInput } from './wizard-services/prebrief-token.service';
import { BRIEF_EXECUTION_DIAGNOSTIC_DEBOUNCE_MS } from '../../config/client-analytics-batching';
import {
  BRIEF_LAYOUT_WIZARD as BRIEF_LAYOUT_WIZARD_CONST,
} from './wizard-config/wizard-constants';
import type { NewAuditVariant, NewAuditWizardContract } from './wizard-contract/useNewAuditWizard.types';
import {
  NEW_AUDIT_RESUME_DRAFT_AUDIT_QUERY,
} from '../../config/route-paths';
import { normalizeServerBriefResponsesForWizard } from '../../lib/new-audit-brief-state';
import { useWizardStepState } from './wizard-state/useWizardStepState';
import { useWizardValidationProgress } from './wizard-state/useWizardValidationProgress';
import { useConsultantDpaConsent } from './wizard-services/useConsultantDpaConsent';
import { useWizardDraftAndLaunchActions } from './wizard-services/useWizardDraftAndLaunchActions';
import { useWizardSnapshotStateMachine } from './state-machine/useWizardSnapshotStateMachine';
import { shouldOpenSnapshotGate } from './validators/newAuditWizardGuards';
import { useWizardDraftPersistence } from './draft/useWizardDraftPersistence';
import {
  getSnapshotGenericError,
  runBriefIntelligenceSnapshotAction,
  runBriefIntelligenceWordingAction,
  saveBriefBeforeIntelligence,
} from './api-actions/newAuditApiActions';

export type { NewAuditVariant } from './wizard-contract/useNewAuditWizard.types';

export function shouldRunNewAuditSnapshotGate(args: {
  snapshotStepEnabled: boolean;
  isClientSelfServe: boolean;
  hasDraftAuditId: boolean;
  briefIntelligenceSubStep: 'short_brief' | 'snapshot_confirm';
  intakePrefillActive: boolean;
}): boolean {
  return (
    args.snapshotStepEnabled &&
    !args.isClientSelfServe &&
    args.hasDraftAuditId &&
    args.briefIntelligenceSubStep === 'short_brief' &&
    !args.intakePrefillActive
  );
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

  const newAuditF1DebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newAuditF1RequestSeqRef = useRef(0);
  /** Preserves early vs full snapshot choice when a POST fails before the confirm step. */
  const lastIntelligenceSnapshotRequestEarlyRef = useRef(false);

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
    () =>
      briefTailoredPhaseUnlocked ||
      intakePrefillActive ||
      !APP_FEATURE_FLAGS.newAuditIntelligenceSnapshotStepEnabled,
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

  const earlyIntelligenceEligible = useMemo(() => {
    if (!APP_FEATURE_FLAGS.briefEarlyIntelligenceSnapshotEnabled) return false;
    if (!APP_FEATURE_FLAGS.newAuditIntelligenceSnapshotStepEnabled) return false;
    if (noPublicWebsite) return false;
    if (isClientSelfServe || !draftAuditId) return false;
    if (intakePrefillActive) return false;
    if (briefTailoredFollowUpUnlocked) return false;
    return (
      areEarlyBriefCaptureSlotsSatisfied(intakeMapForSnapshots) &&
      !arePreBriefSubmitSlotsSatisfied(intakeMapForSnapshots)
    );
  }, [
    briefTailoredFollowUpUnlocked,
    draftAuditId,
    intakeMapForSnapshots,
    intakePrefillActive,
    isClientSelfServe,
    noPublicWebsite,
  ]);

  /** Client portal (self-serve) must use `client_form` — was wrongly using consultant surface for metrics. */
  const newAuditBankIntakeSurface: IntakeSurface | undefined = useMemo(() => {
    if (noPublicWebsite) return undefined;
    return isClientSelfServe ? 'client_form' : 'consultant_interview';
  }, [isClientSelfServe, noPublicWebsite]);
  const newAuditCollectionModeForPlan = useMemo(
    () =>
      newAuditStep1CollectionMode({
        noPublicWebsite,
        isClientSelfServe,
        tailoredPhaseUnlocked: briefTailoredFollowUpUnlocked,
      }),
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

  useEffect(() => {
    if (step !== 1 || noPublicWebsite || briefLayoutChoice !== BRIEF_LAYOUT_WIZARD_CONST) return;
    if (!f1IntakeToken) return;
    if (!APP_FEATURE_FLAGS.diagnosticIntakePilotEnabled || !APP_FEATURE_FLAGS.intakeNextQuestionClientEnabled) return;

    const seq = ++newAuditF1RequestSeqRef.current;
    if (newAuditF1DebounceRef.current) clearTimeout(newAuditF1DebounceRef.current);
    newAuditF1DebounceRef.current = setTimeout(() => {
      void (async () => {
        const asMap = briefResponsesToIntakeMap(pipelineGateBriefResponses) as Record<string, unknown>;
        const collectionF1 = isClientSelfServe ? 'self_serve' : 'interview';
        const surfaceF1: IntakeSurface = isClientSelfServe ? 'client_form' : 'consultant_interview';
        try {
          await api.postIntakeNextQuestion(f1IntakeToken, {
            responses: asMap,
            productMode: briefProductMode,
            collectionMode: collectionF1,
            surface: surfaceF1,
            intakeVersionTuple: draftIntakeVersions ?? currentIntakeVersionTuple(),
          });
        } catch {
          // Route disabled or token unlinked / 404
        }
        if (seq !== newAuditF1RequestSeqRef.current) return;
      })();
    }, 450);
    return () => {
      if (newAuditF1DebounceRef.current) clearTimeout(newAuditF1DebounceRef.current);
    };
  }, [
    step,
    noPublicWebsite,
    briefLayoutChoice,
    f1IntakeToken,
    pipelineGateBriefResponses,
    isClientSelfServe,
    briefProductMode,
    draftIntakeVersions,
  ]);

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

  const responsesFingerprint = useMemo(() => JSON.stringify(responses), [responses]);

  useEffect(() => {
    if (step !== 1 || !draftAuditId || noPublicWebsite || briefLayoutChoice !== BRIEF_LAYOUT_WIZARD_CONST) {
      setBriefExecutionDiagnostic(null);
      setBriefWizardServerVisibleQuestionIds(undefined);
      setBriefExecutionDiagnosticLoading(false);
      setBriefExecutionDiagnosticError(false);
      return;
    }

    let cancelled = false;
    setBriefExecutionDiagnosticLoading(true);
    setBriefExecutionDiagnosticError(false);
    const tid = window.setTimeout(() => {
      void api
        .getBrief(draftAuditId)
        .then(payload => {
          if (cancelled) return;
          const visibleFromBrief = Array.isArray(payload.questions)
            ? payload.questions
                .map((q): string =>
                  q && typeof q === 'object' && q !== null && 'id' in q
                    ? String((q as { id?: unknown }).id ?? '')
                    : '',
                )
                .filter(id => id.length > 0)
            : [];
          setBriefWizardServerVisibleQuestionIds(
            visibleFromBrief.length > 0 ? visibleFromBrief : undefined,
          );
          if (payload.readiness != null && payload.critical_signals != null) {
            setBriefExecutionDiagnostic({
              readiness: payload.readiness,
              critical_signals: payload.critical_signals,
              remediation_queue: payload.remediation_queue ?? [],
            });
          } else {
            setBriefExecutionDiagnostic(null);
          }
          setBriefExecutionDiagnosticLoading(false);
        })
        .catch(() => {
          if (!cancelled) {
            setBriefExecutionDiagnosticError(true);
            setBriefWizardServerVisibleQuestionIds(undefined);
            setBriefExecutionDiagnosticLoading(false);
          }
        });
    }, BRIEF_EXECUTION_DIAGNOSTIC_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(tid);
    };
  }, [step, draftAuditId, noPublicWebsite, briefLayoutChoice, responsesFingerprint]);

  function handleResponseChange(id: string, value: string | string[] | number | null) {
    setResponses(prev => ({ ...prev, [id]: { value, source: responseSource } }));
  }

  function handleSetUnknown(id: string) {
    setResponses(prev => ({ ...prev, [id]: { value: null, source: 'unknown' } }));
  }

  const runBriefIntelligenceSnapshot = useCallback(async (opts?: { earlyCapture?: boolean }) => {
    if (!draftAuditId) {
      setIntelligenceSnapshotError(WORKSPACE_PAGE_COPY.newAudit.step1.intelligenceSnapshot.missingAuditId);
      return;
    }
    setIntelligenceSnapshotLoading(true);
    setIntelligenceSnapshotError(null);
    lastIntelligenceSnapshotRequestEarlyRef.current = Boolean(opts?.earlyCapture);
    try {
      const nextVersions = await saveBriefBeforeIntelligence({
        draftAuditId,
        isClientSelfServe,
        url,
        noPublicWebsite,
        name,
        industry,
        industrySpecify,
        responses,
        briefLayoutChoice,
        preBriefToken: preBriefState.preBriefToken,
        intakeTokenFromUrl,
        draftIntakeVersions,
      });
      if (nextVersions) {
        setDraftIntakeVersions(nextVersions);
      }
      bumpClientProjectContextSyncTick();
      const snap = await runBriefIntelligenceSnapshotAction({
        draftAuditId,
        earlyCapture: opts?.earlyCapture,
      });
      snapshotMachine.moveToSnapshotConfirm(snap, opts?.earlyCapture ? 'early' : 'standard');
    } catch (e) {
      setIntelligenceSnapshotPhase('standard');
      setIntelligenceSnapshotError(getSnapshotGenericError(e));
    } finally {
      setIntelligenceSnapshotLoading(false);
    }
  }, [
    briefLayoutChoice,
    bumpClientProjectContextSyncTick,
    draftAuditId,
    draftIntakeVersions,
    industry,
    industrySpecify,
    intakeTokenFromUrl,
    isClientSelfServe,
    name,
    noPublicWebsite,
    preBriefState.preBriefToken,
    responses,
    snapshotMachine,
    url,
  ]);

  const runEarlyBriefIntelligenceSnapshot = useCallback(async () => {
    await runBriefIntelligenceSnapshot({ earlyCapture: true });
  }, [runBriefIntelligenceSnapshot]);

  const retryBriefIntelligenceSnapshot = useCallback(async () => {
    await runBriefIntelligenceSnapshot(lastIntelligenceSnapshotRequestEarlyRef.current ? { earlyCapture: true } : {});
  }, [runBriefIntelligenceSnapshot]);

  const applyMergedBriefServerRowIntoState = useCallback(
    (briefRow: unknown) => {
      const next = normalizeServerBriefResponsesForWizard(briefRow, responseSource);
      if (Object.keys(next).length === 0) return;
      setResponses(next);
    },
    [responseSource],
  );

  const handleBriefCloneFromAudit = useCallback(
    async (sourceAuditId: string) => {
      if (!draftAuditId || !APP_FEATURE_FLAGS.briefCloneFromAuditEnabled) return;
      const merged = await api.postAuditsBriefCloneFrom(draftAuditId, { source_audit_id: sourceAuditId });
      applyMergedBriefServerRowIntoState(merged.brief);
      bumpClientProjectContextSyncTick();
    },
    [applyMergedBriefServerRowIntoState, bumpClientProjectContextSyncTick, draftAuditId],
  );

  const handleStep1ContinueToReview = useCallback(async () => {
    if (!step2Complete) return;
    const useSnapshotGate = shouldOpenSnapshotGate({
      isClientSelfServe,
      draftAuditId,
      briefIntelligenceSubStep,
      intakePrefillActive,
    });
    if (!useSnapshotGate) {
      setStep(2);
      return;
    }
    if (intelligenceLlm1Done) {
      setStep(2);
      return;
    }
    await runBriefIntelligenceSnapshot();
  }, [
    briefIntelligenceSubStep,
    draftAuditId,
    intakePrefillActive,
    intelligenceLlm1Done,
    isClientSelfServe,
    runBriefIntelligenceSnapshot,
    step2Complete,
  ]);

  const handleIntelligenceSnapshotSkipToReview = useCallback(() => {
    snapshotMachine.skipSnapshotAndGoReview(setStep);
  }, [snapshotMachine, setStep]);

  const handleIntelligenceSnapshotSaveApplyAndWording = useCallback(
    async (selectedInferredIds: Set<string>) => {
      if (!draftAuditId || !intelligenceSnapshotResult) {
        return;
      }
      setIntelligenceSnapshotError(null);

      if (intelligenceSnapshotPhase === 'early') {
        setIntelEarlyMergePending(true);
        try {
          const nextResponses = applyIntelligenceInferredSelections(
            responses,
            intelligenceSnapshotResult.inferred_preview,
            selectedInferredIds,
            responseSource,
          );
          setResponses(nextResponses);
          const nextVersions = await saveBriefBeforeIntelligence({
            draftAuditId,
            isClientSelfServe,
            url,
            noPublicWebsite,
            name,
            industry,
            industrySpecify,
            responses: nextResponses,
            briefLayoutChoice,
            preBriefToken: preBriefState.preBriefToken,
            intakeTokenFromUrl,
            draftIntakeVersions,
          });
          if (nextVersions) {
            setDraftIntakeVersions(nextVersions);
          }
          bumpClientProjectContextSyncTick();
          snapshotMachine.resetToShortBrief();
        } catch (e) {
          setIntelligenceSnapshotError(getSnapshotGenericError(e));
        } finally {
          setIntelEarlyMergePending(false);
        }
        return;
      }

      setIntelligenceWordingLoading(true);
      try {
        const nextResponses = applyIntelligenceInferredSelections(
          responses,
          intelligenceSnapshotResult.inferred_preview,
          selectedInferredIds,
          responseSource,
        );
        setResponses(nextResponses);
        const nextVersions = await saveBriefBeforeIntelligence({
          draftAuditId,
          isClientSelfServe,
          url,
          noPublicWebsite,
          name,
          industry,
          industrySpecify,
          responses: nextResponses,
          briefLayoutChoice,
          preBriefToken: preBriefState.preBriefToken,
          intakeTokenFromUrl,
          draftIntakeVersions,
        });
        if (nextVersions) {
          setDraftIntakeVersions(nextVersions);
        }
        bumpClientProjectContextSyncTick();
        const wording = await runBriefIntelligenceWordingAction(draftAuditId);
        setIntelligenceWordingUi({
          label_overrides: wording.label_overrides ?? {},
          hint_overrides: wording.hint_overrides ?? {},
          option_display_overrides: wording.option_display_overrides ?? {},
        });
        setBriefTailoredPhaseUnlocked(true);
        snapshotMachine.resetToShortBrief();
      } catch (e) {
        setIntelligenceSnapshotError(getSnapshotGenericError(e));
      } finally {
        setIntelligenceWordingLoading(false);
      }
    },
    [
      briefLayoutChoice,
      bumpClientProjectContextSyncTick,
      draftAuditId,
      draftIntakeVersions,
      industry,
      industrySpecify,
      intakeTokenFromUrl,
      intelligenceSnapshotPhase,
      intelligenceSnapshotResult,
      isClientSelfServe,
      name,
      noPublicWebsite,
      preBriefState.preBriefToken,
      responses,
      responseSource,
      snapshotMachine,
      url,
    ],
  );

  const handleIntelligenceSnapshotBackToBriefForm = useCallback(() => {
    snapshotMachine.resetToShortBrief();
  }, [snapshotMachine]);

  const handleBackFromStep2ToStep1 = useCallback(() => {
    setBriefTailoredPhaseUnlocked(true);
    snapshotMachine.resetToShortBrief();
    setStep(1);
  }, [snapshotMachine]);

  const handleBackFromStep1ToStep0 = useCallback(() => {
    snapshotMachine.resetToShortBrief();
    setIntelligenceWordingUi({ ...EMPTY_INTELLIGENCE_WORDING_UI });
    setStep(0);
    setBasicsSubStep(0);
  }, [snapshotMachine]);

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

