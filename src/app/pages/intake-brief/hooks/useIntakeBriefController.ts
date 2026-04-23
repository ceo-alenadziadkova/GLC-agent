import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildBriefSchemaSnapshot, currentIntakeVersionTuple } from '@glc/intake-core';
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
import { INTAKE_PILOT_SIGNAL_KEYS_BY_QUESTION_ID } from '../../../config/intake-critical-signal-map';

export type IntakeBriefPhase = 'form' | 'review' | 'success';

const copy = WORKSPACE_PAGE_COPY.intakePublicPrebrief;

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

  const hadSubmissionOnLoadRef = useRef(false);
  const intakeKpiSessionIdRef = useRef(crypto.randomUUID());
  const intakeKpiHadActivityRef = useRef(false);
  const intakeKpiShownQuestionIdsRef = useRef(new Set<string>());

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
    const byQuestion: Record<string, { signalKey: string; confidence: 'high' | 'medium' | 'low' | 'unknown' }> = {};
    const byKey = intakeSchemaSnapshot?.critical_signals?.by_key ?? {};
    for (const [questionId, signalKeys] of Object.entries(INTAKE_PILOT_SIGNAL_KEYS_BY_QUESTION_ID)) {
      const signalKey = signalKeys[0];
      if (!signalKey) continue;
      byQuestion[questionId] = {
        signalKey,
        confidence: byKey[signalKey] ?? 'unknown',
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
        setPhase('form');
        setLastSubmittedIso(null);
        setNlIngressText('');
        setNlIngressStatus('idle');
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

  const answered = countPreBriefSatisfied(responses);
  const total = getPreBriefSubmitSlotIds(responses).length;
  const formComplete = answered === total;

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

  const scrollToQuestion = useCallback((id: string) => {
    setPhase('form');
    window.requestAnimationFrame(() => {
      document.getElementById(`intake-q-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  useEffect(() => {
    if (loading || !token || phase !== 'form') return;
    const ids = questionSections.flatMap(block => block.questions.map(q => q.id));
    if (ids.length === 0) return;

    const io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const bankId = el.id?.replace(/^intake-q-/, '') ?? '';
          if (!bankId || intakeKpiShownQuestionIdsRef.current.has(bankId)) continue;
          intakeKpiShownQuestionIdsRef.current.add(bankId);
          void api.reportIntelligenceKpi(token, {
            event: 'question_shown',
            question_id: bankId,
            client_session_id: intakeKpiSessionIdRef.current,
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
  }, [loading, token, phase, questionSections]);

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
    if (!token || !nlIngressText.trim()) return;
    setNlIngressStatus('sending');
    try {
      await api.submitIntakeNlDescribe(token, nlIngressText.trim());
      setNlIngressStatus('ok');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNlIngressStatus('hidden');
      } else {
        setNlIngressStatus('error');
      }
    }
  }, [token, nlIngressText]);

  const confirmSubmit = useCallback(async () => {
    if (!token) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await api.submitIntakeResponses(token, coerceA11ForNoWebsitePresence(responses));
      setLastSubmittedIso(result.submitted_at);
      setSubmittedAt(result.submitted_at);
      setPhase('success');
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
    readinessPanel,
    intelligenceByQuestionId,
    signalConfidenceByQuestionId,
    submittedAt,
    expiresAtIso,
    submitting,
    submitError,
    lastSubmittedIso,
    formComplete,
    answered,
    total,
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
    scrollToQuestion,
    confirmSubmit,
    nlIngress:
      nlIngressStatus === 'hidden'
        ? undefined
        : {
            text: nlIngressText,
            onTextChange: setNlIngressText,
            onSubmit: () => void submitNlIngress(),
            busy: nlIngressStatus === 'sending',
            status: nlIngressStatus === 'ok' ? 'ok' : nlIngressStatus === 'error' ? 'error' : 'idle',
          },
  };
}
