import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

  const hadSubmissionOnLoadRef = useRef(false);

  const visibleQuestions = useMemo(
    () => questions.filter(q => !(q.id === 'a11' && websitePresenceMeansNoPublicSite(responses))),
    [questions, responses],
  );

  const questionSections = useMemo(
    () => groupBriefQuestionsBySection(visibleQuestions),
    [visibleQuestions],
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
        setPhase('form');
        setLastSubmittedIso(null);
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

  const onFieldChange = useCallback((id: string, value: string | string[] | number | null) => {
    setResponses(prev => patchBriefQuestionResponse(prev, id, value));
  }, []);

  const onIndustryChange = useCallback((value: string | string[] | number | null) => {
    setResponses(prev => patchIndustryResponse(prev, value));
  }, []);

  const onWebsitePresenceChange = useCallback((value: string | string[] | number | null) => {
    setResponses(prev => patchWebsitePresenceResponse(prev, value));
  }, []);

  const onUnknown = useCallback((id: string) => {
    setResponses(prev => patchUnknownResponse(prev, id));
  }, []);

  const scrollToQuestion = useCallback((id: string) => {
    setPhase('form');
    window.requestAnimationFrame(() => {
      document.getElementById(`intake-q-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

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
  };
}
