import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildBriefSchemaSnapshot, computePilotCriticalBottleneckRank, currentIntakeVersionTuple } from '@glc/intake-core';
import { apiIntakeIntelligenceKpi } from '../../../config/api-paths';
import { API_URL } from '../../../data/api-http';
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
import { computeKpiCaseKeys } from '../../../lib/intake-kpi-case-keys';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import {
  patchBriefQuestionResponse,
  patchIndustryResponse,
  patchUnknownResponse,
  patchWebsitePresenceResponse,
} from '../lib/intake-brief-response-updates';
import { INTAKE_PILOT_SIGNAL_KEYS_BY_QUESTION_ID } from '../../../config/intake-critical-signal-map';

export type IntakeBriefPhase = 'form' | 'review' | 'success';
type IntakeJourneyStage = 'fast_pass' | 'precision_pass';
type IntakeQuestionMode = 'progressive' | 'all_questions';

const copy = WORKSPACE_PAGE_COPY.intakePublicPrebrief;
const NL_INGRESS_CONSENT_KEY = 'glc:intake:nl-consent-v1';
const INTAKE_PROGRESSIVE_STATE_KEY_PREFIX = 'glc:intake:progressive-state:';

function intakeProgressiveStateKey(token: string): string {
  return `${INTAKE_PROGRESSIVE_STATE_KEY_PREFIX}${token}`;
}

function isReliableSource(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const source = (value as { source?: unknown }).source;
  return source === 'client' || source === 'consultant' || source === 'recon_confirmed';
}

function buildFastPassQuestionIds(args: {
  questions: BriefQuestion[];
  confidenceByQuestionId: Record<string, { confidence: 'high' | 'medium' | 'low' | 'unknown' }>;
}): string[] {
  const requiredIds = args.questions.filter(q => q.priority === 'required').map(q => q.id);
  const lowConfidenceIds = args.questions
    .filter(q => {
      const confidence = args.confidenceByQuestionId[q.id]?.confidence ?? 'unknown';
      return confidence === 'low' || confidence === 'unknown';
    })
    .map(q => q.id);
  const dedup = Array.from(new Set([...requiredIds, ...lowConfidenceIds, ...args.questions.map(q => q.id)]));
  return dedup.slice(0, 8);
}

function buildProgressiveQueue(visibleQuestions: BriefQuestion[], ids: string[]): string[][] {
  const byId = new Set(visibleQuestions.map(q => q.id));
  const queue: string[][] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    if (id === 'a5' && byId.has('a11') && ids.includes('a11')) {
      queue.push(['a5', 'a11']);
      seen.add('a5');
      seen.add('a11');
      continue;
    }
    queue.push([id]);
    seen.add(id);
  }
  return queue;
}

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
  const [journeyStage, setJourneyStage] = useState<IntakeJourneyStage>('fast_pass');
  const [questionMode, setQuestionMode] = useState<IntakeQuestionMode>('progressive');
  const [progressiveStepIndex, setProgressiveStepIndex] = useState(0);
  const [optionalDetailsOpenById, setOptionalDetailsOpenById] = useState<Record<string, boolean>>({});
  const [resumeBannerVisible, setResumeBannerVisible] = useState(false);

  const hadSubmissionOnLoadRef = useRef(false);
  const intakeKpiSessionIdRef = useRef(crypto.randomUUID());
  const intakeKpiHadActivityRef = useRef(false);
  const intakeKpiShownQuestionIdsRef = useRef(new Set<string>());
  const intakeKpiBottleneckRankRef = useRef<number | null>(null);
  const fastPassStartedRef = useRef(false);
  const fastPassCompletedRef = useRef(false);
  const precisionPassStartedRef = useRef(false);

  const intakeSchemaSnapshot = useMemo(() => {
    try {
      return buildBriefSchemaSnapshot({
        responses: briefResponsesToIntakeMap(responses),
        productMode: 'full',
        collectionMode: 'pre_brief',
        surface: 'client_form',
        intakeVersionTuple: currentIntakeVersionTuple(),
      });
    } catch {
      return null;
    }
  }, [responses]);

  const intelligenceByQuestionId = useMemo(() => {
    const byId: Record<
      string,
      {
        whyAsked: string;
        semanticDomain: 'market' | 'value' | 'economics' | 'operations' | 'resources' | 'risks';
        decisionImpact: Array<{ target: string; weight: 'low' | 'medium' | 'high'; effectDescription: string }>;
      }
    > = {};
    const rows = intakeSchemaSnapshot?.questions ?? [];
    for (const row of rows) {
      if (row.intelligence) {
        byId[row.id] = row.intelligence;
      }
    }
    return byId;
  }, [intakeSchemaSnapshot]);

  const signalConfidenceByQuestionId = useMemo(() => {
    const byQuestion: Record<
      string,
      {
        signalKey: string;
        confidence: 'high' | 'medium' | 'low' | 'unknown';
        certaintyStage: 'assumed' | 'confirming' | 'confirmed';
      }
    > = {};
    const byKey = intakeSchemaSnapshot?.critical_signals?.by_key ?? {};
    const certaintyBySignal = new Map<string, 'assumed' | 'confirming' | 'confirmed'>();
    for (const entry of intakeSchemaSnapshot?.readiness?.trace ?? []) {
      const signalKey = entry.signalKey;
      if (!signalKey) continue;
      if (entry.code === 'uncertainty_closed' || entry.code === 'hypothesis_confirmed') {
        certaintyBySignal.set(signalKey, 'confirmed');
      } else if (entry.code === 'hypothesis_formed' && !certaintyBySignal.has(signalKey)) {
        certaintyBySignal.set(signalKey, 'confirming');
      }
    }
    for (const [questionId, signalKeys] of Object.entries(INTAKE_PILOT_SIGNAL_KEYS_BY_QUESTION_ID)) {
      const signalKey = signalKeys[0];
      if (!signalKey) continue;
      byQuestion[questionId] = {
        signalKey,
        confidence: byKey[signalKey] ?? 'unknown',
        certaintyStage: certaintyBySignal.get(signalKey) ?? 'assumed',
      };
    }
    return byQuestion;
  }, [intakeSchemaSnapshot]);

  const visibleQuestions = useMemo(() => {
    const filtered = questions.filter(q => !(q.id === 'a11' && websitePresenceMeansNoPublicSite(responses)));
    return filtered.map(q => ({
      ...q,
      ...(intelligenceByQuestionId[q.id] ? intelligenceByQuestionId[q.id] : {}),
    }));
  }, [questions, responses, intelligenceByQuestionId]);

  const questionSections = useMemo(
    () => groupBriefQuestionsBySection(visibleQuestions),
    [visibleQuestions],
  );
  const adaptiveFastPassIds = useMemo(
    () => buildFastPassQuestionIds({ questions: visibleQuestions, confidenceByQuestionId: signalConfidenceByQuestionId }),
    [visibleQuestions, signalConfidenceByQuestionId],
  );
  const precisionPassIds = useMemo(
    () =>
      visibleQuestions
        .filter(q => !adaptiveFastPassIds.includes(q.id))
        .filter(q => {
          const confidence = signalConfidenceByQuestionId[q.id]?.confidence ?? 'unknown';
          return confidence === 'low' || confidence === 'unknown';
        })
        .map(q => q.id),
    [adaptiveFastPassIds, signalConfidenceByQuestionId, visibleQuestions],
  );
  const skippedByConfidenceIds = useMemo(
    () =>
      visibleQuestions
        .filter(q => !adaptiveFastPassIds.includes(q.id))
        .filter(q => {
          const confidence = signalConfidenceByQuestionId[q.id]?.confidence ?? 'unknown';
          return (confidence === 'high' || confidence === 'medium') && isReliableSource(responses[q.id]);
        })
        .map(q => q.id),
    [adaptiveFastPassIds, responses, signalConfidenceByQuestionId, visibleQuestions],
  );
  const activeQuestionIds = useMemo(() => {
    if (journeyStage === 'fast_pass') return adaptiveFastPassIds;
    return precisionPassIds;
  }, [adaptiveFastPassIds, journeyStage, precisionPassIds]);
  const progressiveQueue = useMemo(
    () => buildProgressiveQueue(visibleQuestions, activeQuestionIds),
    [activeQuestionIds, visibleQuestions],
  );
  const activeQueueItem = useMemo(() => progressiveQueue[progressiveStepIndex] ?? [], [progressiveQueue, progressiveStepIndex]);
  const displayedQuestionSections = useMemo(() => {
    if (questionMode === 'all_questions') return questionSections;
    const activeIds = new Set(activeQueueItem);
    const subset = visibleQuestions.filter(q => activeIds.has(q.id));
    return groupBriefQuestionsBySection(subset);
  }, [questionMode, questionSections, activeQueueItem, visibleQuestions]);

  const answered = countPreBriefSatisfied(responses);

  const readinessPanel = useMemo(() => {
    const readiness = intakeSchemaSnapshot?.readiness;
    const state = answered === 0
      ? 'pristine'
      : readiness?.auditReadinessStatus === 'blocked' || readiness?.flowReadinessStatus === 'blocked'
        ? 'blocked'
        : 'partial';
    const questionLabelById = new Map(questions.map(q => [q.id, q.question]));
    const remediation = (intakeSchemaSnapshot?.remediation_queue ?? []).map(id => ({
      id,
      label: questionLabelById.get(id) ?? id,
    }));
    const trace = (readiness?.trace ?? []).map(item => ({
      code: item.code,
      questionId: item.questionId,
      signalKey: item.signalKey,
    }));
    return {
      state,
      flowReadinessStatus: readiness?.flowReadinessStatus ?? 'flow_ready',
      auditReadinessStatus: readiness?.auditReadinessStatus ?? 'audit_ready',
      criticalSignals: intakeSchemaSnapshot?.critical_signals?.by_key ?? {},
      remediation,
      trace,
    };
  }, [answered, intakeSchemaSnapshot, questions]);

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
      if (!token) return;
      void api.reportIntelligenceKpi(token, {
        event: 'optional_details_submitted',
        question_id: id,
        client_session_id: intakeKpiSessionIdRef.current,
      });
    },
    [token],
  );
  const onAdvanceProgressive = useCallback(() => {
    if (questionMode === 'all_questions') {
      setPhase('review');
      return;
    }
    const atLastStep = progressiveStepIndex >= progressiveQueue.length - 1;
    if (!atLastStep) {
      setProgressiveStepIndex(prev => prev + 1);
      return;
    }
    if (journeyStage === 'fast_pass') {
      if (!fastPassCompletedRef.current && token) {
        fastPassCompletedRef.current = true;
        void api.reportIntelligenceKpi(token, {
          event: 'fast_pass_completed',
          client_session_id: intakeKpiSessionIdRef.current,
        });
      }
      if (precisionPassIds.length > 0) {
        setJourneyStage('precision_pass');
        setProgressiveStepIndex(0);
      } else {
        setPhase('review');
      }
      return;
    }
    setPhase('review');
  }, [journeyStage, precisionPassIds.length, progressiveQueue.length, progressiveStepIndex, questionMode, token]);
  const onBackProgressive = useCallback(() => {
    if (questionMode === 'all_questions') {
      setQuestionMode('progressive');
      return;
    }
    if (progressiveStepIndex > 0) {
      setProgressiveStepIndex(prev => prev - 1);
      return;
    }
    if (journeyStage === 'precision_pass') {
      setJourneyStage('fast_pass');
      setProgressiveStepIndex(0);
    }
  }, [journeyStage, progressiveStepIndex, questionMode]);
  const onSaveAndContinueLater = useCallback(() => {
    if (!token || typeof window === 'undefined') return;
    window.localStorage.setItem(
      intakeProgressiveStateKey(token),
      JSON.stringify({
        responses,
        stage: journeyStage,
        mode: questionMode,
        stepIndex: progressiveStepIndex,
      }),
    );
  }, [journeyStage, progressiveStepIndex, questionMode, responses, token]);

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

  useEffect(() => {
    if (loading || !token || phase !== 'form') return;
    const ids = kpiVisibleBankIds;
    if (ids.length === 0) return;

    const io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const bankId = el.id?.replace(/^intake-q-/, '') ?? '';
          if (!bankId || intakeKpiShownQuestionIdsRef.current.has(bankId)) continue;
          intakeKpiShownQuestionIdsRef.current.add(bankId);
          const asMap = briefResponsesToIntakeMap(responses) as Record<string, unknown>;
          const bottleneck = computePilotCriticalBottleneckRank({
            responses: asMap,
            plan: { eligible: kpiVisibleBankIds },
          });
          const prev = intakeKpiBottleneckRankRef.current;
          const confidenceMoved = bottleneck != null && prev != null && bottleneck > prev;
          if (bottleneck != null) {
            intakeKpiBottleneckRankRef.current = bottleneck;
          }
          void api.reportIntelligenceKpi(token, {
            event: 'question_shown',
            question_id: bankId,
            client_session_id: intakeKpiSessionIdRef.current,
            case_keys: computeKpiCaseKeys(asMap, kpiVisibleBankIds),
            ...(confidenceMoved ? { confidence_moved: true } : {}),
          });
        }
      },
      { root: null, threshold: 0.25 },
    );

    const handle = window.requestAnimationFrame(() => {
      for (const id of ids) {
        const node = document.getElementById(`intake-q-${id}`);
        if (node) io.observe(node);
      }
    });

    return () => {
      window.cancelAnimationFrame(handle);
      io.disconnect();
    };
  }, [loading, token, phase, kpiVisibleBankIds, responses]);
  useEffect(() => {
    if (!token || phase !== 'form') return;
    if (!fastPassStartedRef.current && journeyStage === 'fast_pass') {
      fastPassStartedRef.current = true;
      void api.reportIntelligenceKpi(token, {
        event: 'fast_pass_started',
        client_session_id: intakeKpiSessionIdRef.current,
      });
    }
    if (!precisionPassStartedRef.current && journeyStage === 'precision_pass') {
      precisionPassStartedRef.current = true;
      void api.reportIntelligenceKpi(token, {
        event: 'precision_pass_started',
        client_session_id: intakeKpiSessionIdRef.current,
      });
    }
  }, [journeyStage, phase, token]);

  useEffect(() => {
    if (!token) return;
    const onPageHide = () => {
      if (!intakeKpiHadActivityRef.current) return;
      if (phase !== 'form') return;
      const payload = JSON.stringify({
        event: 'drop_off' as const,
        client_session_id: intakeKpiSessionIdRef.current,
      });
      const url = `${API_URL}${apiIntakeIntelligenceKpi(token)}`;
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
      }
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [token, phase]);

  const submitNlIngress = useCallback(async () => {
    if (!token || !nlIngressText.trim() || !nlIngressConsentAccepted) return;
    setNlIngressStatus('sending');
    try {
      await api.submitIntakeNlDescribe(token, nlIngressText.trim(), crypto.randomUUID());
      setNlIngressStatus('ok');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNlIngressStatus('hidden');
      } else {
        setNlIngressStatus('error');
      }
    }
  }, [token, nlIngressText, nlIngressConsentAccepted]);

  const confirmSubmit = useCallback(async () => {
    if (!token) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await api.submitIntakeResponses(token, coerceA11ForNoWebsitePresence(responses));
      setLastSubmittedIso(result.submitted_at);
      setSubmittedAt(result.submitted_at);
      setPhase('success');
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(intakeProgressiveStateKey(token));
      }
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'INTAKE_LINK_EXPIRED' || err.status === 410)) {
        setExpired(true);
      } else {
        setSubmitError(toUiApiErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  }, [token, responses]);

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
  const visibleOptionalDetailsById = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const id of activeQueueItem) {
      if (optionalDetailsOpenById[id]) out[id] = true;
    }
    return out;
  }, [activeQueueItem, optionalDetailsOpenById]);

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
    nlIngress:
      nlIngressStatus === 'hidden'
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
  };
}
