import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildBriefSchemaSnapshot, currentIntakeVersionTuple } from '@glc/intake-core';
import { APP_FEATURE_FLAGS } from '../../../config/app-feature-flags';
import { api, ApiError } from '../../../data/apiService';
import type { BriefQuestion, BriefResponses } from '../../../data/briefQuestions';
import {
  coerceA11ForNoWebsitePresence,
  countPreBriefSatisfied,
  briefResponseTrimmedString,
  getPreBriefSubmitSlotIds,
  groupBriefQuestionsBySection,
  isPreBriefQuestionSatisfied,
  mergeBriefResponsesPreferFilled,
  websitePresenceMeansNoPublicSite,
} from '../../../data/briefQuestions';
import { normalizeIntakeToResponses } from '../../../data/intakeBriefMap';
import { briefResponsesToIntakeMap } from '../../../data/intakeBriefMap';
import {
  applyIntakeMetadataPrefill,
  parseIntakeClientMetadata,
  hasIntakeConsultantPrefill,
  buildFollowUpExpectationLine,
  buildIntakeContactFooterLines,
} from '../../../lib/intake-client-copy';
import { toUiApiErrorMessage } from '../../../lib/api-error-ui';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import {
  patchBriefQuestionResponse,
  patchIndustryResponse,
  patchUnknownResponse,
  patchWebsitePresenceResponse,
} from '../lib/intake-brief-response-updates';
import { splitPreBriefSlotsIntoQueueSteps } from '../lib/split-pre-brief-slot-queue';
import {
  buildFastPassQuestionIds,
  buildPrecisionPassIds,
  buildProgressiveQueue,
  buildSkippedByConfidenceIds,
} from '../lib/intake-brief-queue';
import { shouldForceProgressiveMode } from '../guards/intakeBriefGuards';
import {
  intakeEntryModeStorageKey,
  intakeProgressiveStateKey,
  readIntakeEntryModeFromStorage,
} from '../lib/intake-brief-storage';
import { useIntakeBriefF1Effect } from '../effects/useIntakeBriefF1Effect';
import { useIntakeBriefKpiEffects } from '../effects/useIntakeBriefKpiEffects';
import { useIntakeBriefSubmissionActions } from '../effects/useIntakeBriefSubmissionActions';
import { useIntakeBriefProgressiveActions } from '../effects/useIntakeBriefProgressiveActions';
import {
  buildIntelligenceByQuestionId,
  buildRawQuestionList,
  buildReadinessPanel,
  buildSignalConfidenceByQuestionId,
  buildVisibleQuestions,
} from '../lib/intake-brief-derived';
import {
  buildModeSubtitleOverride,
  buildProgressiveContinueBusy,
  buildTailoredPhaseBanner,
  buildVisibleOptionalDetailsById,
} from '../lib/intake-brief-view-model';

export type IntakeBriefPhase = 'form' | 'review' | 'success';
type IntakeJourneyStage = 'fast_pass' | 'precision_pass';
type IntakeQuestionMode = 'progressive' | 'all_questions';

const copy = WORKSPACE_PAGE_COPY.intakePublicPrebrief;
const NL_INGRESS_CONSENT_KEY = 'glc:intake:nl-consent-v1';

export function useIntakeBriefController(rawToken: string | undefined) {
  const token = rawToken?.trim() ?? '';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [questions, setQuestions] = useState<BriefQuestion[]>([]);
  const [metadataRecord, setMetadataRecord] = useState<Record<string, unknown>>({});
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [expiresAtIso, setExpiresAtIso] = useState<string | null>(null);
  const [responses, setResponses] = useState<BriefResponses>({});
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<IntakeBriefPhase>('form');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastSubmittedIso, setLastSubmittedIso] = useState<string | null>(null);
  const [nlIngressText, setNlIngressText] = useState('');
  const [nlIngressStatus, setNlIngressStatus] = useState<'idle' | 'sending' | 'ok' | 'error' | 'hidden'>('idle');
  const [nlIngressConsentAccepted, setNlIngressConsentAccepted] = useState(false);
  const [intakeEntryMode, setIntakeEntryMode] = useState<'form' | 'dictation'>('form');
  const [journeyStage, setJourneyStage] = useState<IntakeJourneyStage>('fast_pass');
  const [questionMode, setQuestionMode] = useState<IntakeQuestionMode>('progressive');
  const [progressiveStepIndex, setProgressiveStepIndex] = useState(0);
  const [optionalDetailsOpenById, setOptionalDetailsOpenById] = useState<Record<string, boolean>>({});
  const [resumeBannerVisible, setResumeBannerVisible] = useState(false);
  const [tailoredPayload, setTailoredPayload] = useState<{
    questions: BriefQuestion[];
    questionIds: string[];
  } | null>(null);
  /** F2 / LLM display-only labels (bank ids); cleared when leaving tailored. */
  const [tailoredLabelOverrides, setTailoredLabelOverrides] = useState<Record<string, string>>({});
  /** One short paragraph from intelligence snapshot; does not claim inferred cells were applied. */
  const [intelligenceSnapshotNarrative, setIntelligenceSnapshotNarrative] = useState<string | null>(null);
  const [twoPhaseWave, setTwoPhaseWave] = useState<'none' | 'prebrief' | 'tailored_loading' | 'tailored'>(() =>
    APP_FEATURE_FLAGS.intakeTwoPhasePublicEnabled ? 'prebrief' : 'none',
  );

  const hadSubmissionOnLoadRef = useRef(false);
  const intakeKpiSessionIdRef = useRef(crypto.randomUUID());
  const intakeKpiHadActivityRef = useRef(false);
  const intakeKpiShownQuestionIdsRef = useRef(new Set<string>());
  const intakeKpiBottleneckRankRef = useRef<number | null>(null);
  const fastPassStartedRef = useRef(false);
  const fastPassCompletedRef = useRef(false);
  const precisionPassStartedRef = useRef(false);
  const intakeF1DebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intakeF1RequestSeqRef = useRef(0);

  const [intakeF1, setIntakeF1] = useState<{
    status: 'idle' | 'loading' | 'ok' | 'unavailable';
    decision: {
      action: 'ask' | 'stop';
      questionId: string | null;
      reason: string;
      caseKeys: string[];
    } | null;
  }>({ status: 'idle', decision: null });

  const intakeCollectionMode = useMemo(
    () => (twoPhaseWave === 'tailored' || twoPhaseWave === 'tailored_loading' ? 'full' : 'pre_brief') as const,
    [twoPhaseWave],
  );
  const intakeSchemaSnapshot = useMemo(() => {
    try {
      return buildBriefSchemaSnapshot({
        responses: briefResponsesToIntakeMap(responses),
        productMode: 'full',
        collectionMode: intakeCollectionMode,
        surface: 'client_form',
        intakeVersionTuple: currentIntakeVersionTuple(),
      });
    } catch {
      return null;
    }
  }, [responses, intakeCollectionMode]);

  const intelligenceByQuestionId = useMemo(
    () => buildIntelligenceByQuestionId(intakeSchemaSnapshot),
    [intakeSchemaSnapshot],
  );

  const signalConfidenceByQuestionId = useMemo(
    () => buildSignalConfidenceByQuestionId(intakeSchemaSnapshot),
    [intakeSchemaSnapshot],
  );

  const rawQuestionList = useMemo(
    () => buildRawQuestionList({ phase, twoPhaseWave, tailoredPayload, questions }),
    [phase, twoPhaseWave, tailoredPayload, questions],
  );

  const visibleQuestions = useMemo(
    () =>
      buildVisibleQuestions({
        rawQuestionList,
        responses,
        twoPhaseWave,
        tailoredLabelOverrides,
        intelligenceByQuestionId,
      }),
    [rawQuestionList, responses, intelligenceByQuestionId, twoPhaseWave, tailoredLabelOverrides],
  );

  const questionSections = useMemo(
    () => groupBriefQuestionsBySection(visibleQuestions),
    [visibleQuestions],
  );
  const adaptiveFastPassIds = useMemo(
    () => buildFastPassQuestionIds({ questions: visibleQuestions, confidenceByQuestionId: signalConfidenceByQuestionId }),
    [visibleQuestions, signalConfidenceByQuestionId],
  );
  const precisionPassIds = useMemo(
    () => buildPrecisionPassIds({ visibleQuestions, adaptiveFastPassIds, signalConfidenceByQuestionId }),
    [adaptiveFastPassIds, signalConfidenceByQuestionId, visibleQuestions],
  );
  const skippedByConfidenceIds = useMemo(
    () =>
      buildSkippedByConfidenceIds({
        visibleQuestions,
        adaptiveFastPassIds,
        signalConfidenceByQuestionId,
        responses,
      }),
    [adaptiveFastPassIds, responses, signalConfidenceByQuestionId, visibleQuestions],
  );
  const activeQuestionIds = useMemo(() => {
    if (journeyStage === 'fast_pass') return adaptiveFastPassIds;
    return precisionPassIds;
  }, [adaptiveFastPassIds, journeyStage, precisionPassIds]);
  const preBriefStepGroups = useMemo(() => {
    if (twoPhaseWave === 'none') return null;
    return splitPreBriefSlotsIntoQueueSteps(getPreBriefSubmitSlotIds(responses));
  }, [twoPhaseWave, responses]);
  const progressiveQueue = useMemo(() => {
    if (twoPhaseWave === 'prebrief' || twoPhaseWave === 'tailored_loading') {
      return preBriefStepGroups ?? buildProgressiveQueue(visibleQuestions, activeQuestionIds);
    }
    if (twoPhaseWave === 'tailored' && tailoredPayload) {
      return buildProgressiveQueue(tailoredPayload.questions, tailoredPayload.questionIds);
    }
    return buildProgressiveQueue(visibleQuestions, activeQuestionIds);
  }, [
    twoPhaseWave,
    preBriefStepGroups,
    tailoredPayload,
    visibleQuestions,
    activeQuestionIds,
    journeyStage,
  ]);
  const activeQueueItem = useMemo(() => progressiveQueue[progressiveStepIndex] ?? [], [progressiveQueue, progressiveStepIndex]);
  const displayedQuestionSections = useMemo(() => {
    if (questionMode === 'all_questions') return questionSections;
    const activeIds = new Set(activeQueueItem);
    const subset = visibleQuestions.filter(q => activeIds.has(q.id));
    return groupBriefQuestionsBySection(subset);
  }, [questionMode, questionSections, activeQueueItem, visibleQuestions]);

  const answered = countPreBriefSatisfied(responses);

  const readinessPanel = useMemo(
    () => buildReadinessPanel({ answered, intakeSchemaSnapshot, questions }),
    [answered, intakeSchemaSnapshot, questions],
  );

  const clientMeta = useMemo(() => parseIntakeClientMetadata(metadataRecord), [metadataRecord]);
  const consultantPrefilledIdentity = useMemo(
    () => hasIntakeConsultantPrefill(metadataRecord),
    [metadataRecord],
  );

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setLoadError(copy.invalidLink);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(null);
      setExpired(false);
      try {
        const data = await api.getIntakeToken(token);
        if (cancelled) return;
        setQuestions(data.questions);
        setMetadataRecord(data.metadata ?? {});
        setSubmittedAt(data.submitted_at);
        setExpiresAtIso(data.expires_at ?? null);
        hadSubmissionOnLoadRef.current = !!data.submitted_at;
        setResponses(
          coerceA11ForNoWebsitePresence(
            applyIntakeMetadataPrefill(
              normalizeIntakeToResponses(data.responses ?? {}),
              data.metadata ?? {},
            ),
          ),
        );
        if (typeof window !== 'undefined') {
          const saved = window.localStorage.getItem(intakeProgressiveStateKey(token));
          if (saved) {
            try {
              const parsed = JSON.parse(saved) as {
                responses?: BriefResponses;
                stage?: IntakeJourneyStage;
                mode?: IntakeQuestionMode;
                stepIndex?: number;
              };
              if (parsed.responses) {
                setResponses(prev => mergeBriefResponsesPreferFilled(prev, parsed.responses ?? {}));
                setResumeBannerVisible(true);
              }
              if (parsed.stage === 'fast_pass' || parsed.stage === 'precision_pass') setJourneyStage(parsed.stage);
              if (parsed.mode === 'progressive' || parsed.mode === 'all_questions') setQuestionMode(parsed.mode);
              if (typeof parsed.stepIndex === 'number' && parsed.stepIndex >= 0) setProgressiveStepIndex(parsed.stepIndex);
            } catch {
              // no-op
            }
          }
        }
        setPhase('form');
        setLastSubmittedIso(null);
        setNlIngressText('');
        setNlIngressStatus('idle');
        if (typeof window !== 'undefined') {
          setNlIngressConsentAccepted(window.localStorage.getItem(NL_INGRESS_CONSENT_KEY) === 'true');
        }
        setIntakeEntryMode(readIntakeEntryModeFromStorage(token));
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && (e.code === 'INTAKE_LINK_EXPIRED' || e.status === 410)) {
          setExpired(true);
        } else {
          setLoadError(toUiApiErrorMessage(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const websitePresenceKey = briefResponseTrimmedString(responses.a5);
  useEffect(() => {
    setResponses(prev => coerceA11ForNoWebsitePresence(prev));
  }, [websitePresenceKey]);

  useEffect(() => {
    if (shouldForceProgressiveMode(questionMode)) {
      setQuestionMode('progressive');
    }
  }, [questionMode]);

  useIntakeBriefF1Effect({
    token,
    loading,
    phase,
    responses,
    intakeF1DebounceRef,
    intakeF1RequestSeqRef,
    setIntakeF1,
  });

  const total = getPreBriefSubmitSlotIds(responses).length;
  const formComplete = answered === total;
  const isCurrentStepSatisfied = useMemo(() => {
    if (questionMode === 'all_questions') return formComplete;
    if (activeQueueItem.length === 0) return true;
    return activeQueueItem.every(id => isPreBriefQuestionSatisfied(id, responses));
  }, [activeQueueItem, formComplete, questionMode, responses]);

  const markIntakeKpiActivity = useCallback(() => {
    intakeKpiHadActivityRef.current = true;
  }, []);

  const onFieldChange = useCallback((id: string, value: string | string[] | number | null) => {
    markIntakeKpiActivity();
    setResponses(prev => patchBriefQuestionResponse(prev, id, value));
  }, [markIntakeKpiActivity]);

  const onIndustryChange = useCallback((value: string | string[] | number | null) => {
    markIntakeKpiActivity();
    setResponses(prev => patchIndustryResponse(prev, value));
  }, [markIntakeKpiActivity]);

  const onWebsitePresenceChange = useCallback((value: string | string[] | number | null) => {
    markIntakeKpiActivity();
    setResponses(prev => patchWebsitePresenceResponse(prev, value));
  }, [markIntakeKpiActivity]);

  const onUnknown = useCallback((id: string) => {
    markIntakeKpiActivity();
    setResponses(prev => patchUnknownResponse(prev, id));
  }, [markIntakeKpiActivity]);
  const onOpenOptionalDetails = useCallback(
    (id: string) => {
      setOptionalDetailsOpenById(prev => ({ ...prev, [id]: true }));
      if (!token) return;
      void api.reportIntelligenceKpi(token, {
        event: 'optional_details_opened',
        question_id: id,
        client_session_id: intakeKpiSessionIdRef.current,
      });
    },
    [token],
  );
  const onSubmitOptionalDetails = useCallback(
    (id: string) => {
      setOptionalDetailsOpenById(prev => ({ ...prev, [id]: false }));
      if (!token) return;
      void api.reportIntelligenceKpi(token, {
        event: 'optional_details_submitted',
        question_id: id,
        client_session_id: intakeKpiSessionIdRef.current,
      });
    },
    [token],
  );
  const { onAdvanceProgressive, onBackProgressive, onSaveAndContinueLater } = useIntakeBriefProgressiveActions({
    questionMode,
    twoPhaseWave,
    progressiveStepIndex,
    progressiveQueueLength: progressiveQueue.length,
    token,
    responses,
    journeyStage,
    precisionPassCount: precisionPassIds.length,
    preBriefStepGroupLength: preBriefStepGroups?.length ?? 1,
    intakeKpiSessionIdRef,
    fastPassCompletedRef,
    setPhase,
    setProgressiveStepIndex,
    setJourneyStage,
    setQuestionMode,
    setTwoPhaseWave,
    setTailoredPayload,
    setTailoredLabelOverrides,
    setIntelligenceSnapshotNarrative,
    setSubmitError,
  });

  const scrollToQuestion = useCallback((id: string) => {
    setPhase('form');
    window.requestAnimationFrame(() => {
      document.getElementById(`intake-q-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const kpiVisibleBankIds = useMemo(
    () => questionSections.flatMap(block => block.questions.map(q => q.id)),
    [questionSections],
  );

  useIntakeBriefKpiEffects({
    loading,
    token,
    phase,
    kpiVisibleBankIds,
    responses,
    journeyStage,
    intakeKpiShownQuestionIdsRef,
    intakeKpiBottleneckRankRef,
    intakeKpiSessionIdRef,
    intakeKpiHadActivityRef,
    fastPassStartedRef,
    precisionPassStartedRef,
  });

  const onIntakeEntryModeChange = useCallback(
    (mode: 'form' | 'dictation') => {
      setIntakeEntryMode(mode);
      try {
        if (token) {
          window.localStorage.setItem(intakeEntryModeStorageKey(token), mode);
        }
      } catch {
        // ignore storage quota
      }
    },
    [token],
  );

  const { submitNlIngress, confirmSubmit } = useIntakeBriefSubmissionActions({
    token,
    responses,
    nlIngressText,
    nlIngressConsentAccepted,
    setNlIngressStatus,
    setResponses,
    setSubmitError,
    setSubmitting,
    setLastSubmittedIso,
    setSubmittedAt,
    setPhase,
    setExpired,
  });

  const companyName =
    briefResponseTrimmedString(responses.a12 ?? responses.intake_company_name) ||
    clientMeta.company_name ||
    '';
  const message = clientMeta.message ?? '';
  const consultantLabel = clientMeta.consultant_name?.trim() || copy.defaultConsultantLabel;
  const followUpLine = buildFollowUpExpectationLine(clientMeta);
  const contactFooter = buildIntakeContactFooterLines(clientMeta);
  const successIsUpdate = hadSubmissionOnLoadRef.current;
  const showFastPassDoneBanner =
    journeyStage === 'precision_pass' &&
    (precisionPassIds.length > 0 || fastPassCompletedRef.current);
  const visibleOptionalDetailsById = useMemo(
    () => buildVisibleOptionalDetailsById(activeQueueItem, optionalDetailsOpenById),
    [activeQueueItem, optionalDetailsOpenById],
  );

  const hideGuidedAllToggle = APP_FEATURE_FLAGS.intakeTwoPhasePublicEnabled;
  const tailoredPhaseBanner = buildTailoredPhaseBanner({
    twoPhaseWave,
    progressiveStepIndex,
    intelligenceSnapshotNarrative,
    copy,
  });
  const modeSubtitleOverride = buildModeSubtitleOverride({
    twoPhaseWave,
    tailoredSubtitle: copy.modeSubtitleTailored,
  });
  const progressiveContinueBusy = buildProgressiveContinueBusy(twoPhaseWave);

  return {
    token,
    loading,
    loadError,
    expired,
    phase,
    setPhase,
    questions,
    responses,
    questionSections,
    displayedQuestionSections,
    readinessPanel,
    intelligenceByQuestionId,
    signalConfidenceByQuestionId,
    submittedAt,
    expiresAtIso,
    submitting,
    submitError,
    lastSubmittedIso,
    formComplete,
    isCurrentStepSatisfied,
    answered,
    total,
    journeyStage,
    questionMode,
    progressiveStepIndex,
    progressiveStepTotal: progressiveQueue.length,
    activeQueueItem,
    precisionPassQuestionCount: precisionPassIds.length,
    skippedByConfidenceIds,
    showFastPassDoneBanner,
    optionalDetailsOpenById: visibleOptionalDetailsById,
    resumeBannerVisible,
    clientMeta,
    consultantPrefilledIdentity,
    companyName,
    message,
    consultantLabel,
    followUpLine,
    contactFooter,
    successIsUpdate,
    onFieldChange,
    onIndustryChange,
    onWebsitePresenceChange,
    onUnknown,
    onOpenOptionalDetails,
    onSubmitOptionalDetails,
    onAdvanceProgressive,
    onBackProgressive,
    onSaveAndContinueLater,
    onToggleQuestionMode: (mode: IntakeQuestionMode) => setQuestionMode(mode),
    onDismissResumeBanner: () => setResumeBannerVisible(false),
    scrollToQuestion,
    confirmSubmit,
    /** F1 plan-head from server (requires both diagnostic + next-question client flags; else stays idle). */
    intakeF1,
    /** Shown when NL describe is available; user picks form vs free text/dictation. */
    intakePathChoice:
      APP_FEATURE_FLAGS.intakePublicNlDescribeEnabled && nlIngressStatus !== 'hidden'
        ? { mode: intakeEntryMode, onChange: onIntakeEntryModeChange }
        : undefined,
    nlIngress:
      !APP_FEATURE_FLAGS.intakePublicNlDescribeEnabled ||
      nlIngressStatus === 'hidden' ||
      intakeEntryMode !== 'dictation'
        ? undefined
        : {
            text: nlIngressText,
            onTextChange: setNlIngressText,
            consentAccepted: nlIngressConsentAccepted,
            onConsentChange: (accepted: boolean) => {
              setNlIngressConsentAccepted(accepted);
              if (typeof window !== 'undefined') {
                window.localStorage.setItem(NL_INGRESS_CONSENT_KEY, accepted ? 'true' : 'false');
              }
            },
            onSubmit: () => void submitNlIngress(),
            busy: nlIngressStatus === 'sending',
            status: nlIngressStatus === 'ok' ? 'ok' : nlIngressStatus === 'error' ? 'error' : 'idle',
          },
    hideGuidedAllToggle,
    tailoredPhaseBanner,
    modeSubtitleOverride,
    progressiveContinueBusy,
  };
}
