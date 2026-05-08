import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { api, ApiError } from '../../../data/apiService';
import { coerceA11ForNoWebsitePresence } from '../../../data/briefQuestions';
import type { BriefResponses } from '../../../data/briefQuestions';
import { toUiApiErrorMessage } from '../../../lib/api-error-ui';
import { intakeProgressiveStateKey } from '../lib/intake-brief-storage';

export function useIntakeBriefSubmissionActions(args: {
  token: string;
  responses: BriefResponses;
  nlIngressText: string;
  nlIngressConsentAccepted: boolean;
  setNlIngressStatus: Dispatch<SetStateAction<'idle' | 'sending' | 'ok' | 'error' | 'hidden'>>;
  setResponses: Dispatch<SetStateAction<BriefResponses>>;
  setSubmitError: Dispatch<SetStateAction<string | null>>;
  setSubmitting: Dispatch<SetStateAction<boolean>>;
  setLastSubmittedIso: Dispatch<SetStateAction<string | null>>;
  setSubmittedAt: Dispatch<SetStateAction<string | null>>;
  setPhase: Dispatch<SetStateAction<'form' | 'review' | 'success'>>;
  setExpired: Dispatch<SetStateAction<boolean>>;
}) {
  const submitNlIngress = useCallback(async () => {
    if (!args.token || !args.nlIngressText.trim() || !args.nlIngressConsentAccepted) return;
    args.setNlIngressStatus('sending');
    try {
      const res = await api.submitIntakeNlDescribe(args.token, args.nlIngressText.trim(), crypto.randomUUID());
      const merged = res.authoritative?.merged_responses;
      if (merged && typeof merged === 'object') {
        args.setResponses(prev => {
          const raw = merged as Record<string, unknown>;
          const next = { ...prev };
          for (const [k, v] of Object.entries(raw)) {
            if (v != null && typeof v === 'object' && !Array.isArray(v) && 'value' in (v as Record<string, unknown>)) {
              next[k] = v as (typeof prev)[string];
            } else {
              next[k] = { value: v as never, source: 'client' as const };
            }
          }
          return next;
        });
      }
      args.setNlIngressStatus('ok');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        args.setNlIngressStatus('hidden');
      } else {
        args.setNlIngressStatus('error');
      }
    }
  }, [args]);

  const confirmSubmit = useCallback(async () => {
    if (!args.token) return;
    args.setSubmitError(null);
    args.setSubmitting(true);
    try {
      const result = await api.submitIntakeResponses(args.token, coerceA11ForNoWebsitePresence(args.responses));
      args.setLastSubmittedIso(result.submitted_at);
      args.setSubmittedAt(result.submitted_at);
      args.setPhase('success');
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(intakeProgressiveStateKey(args.token));
      }
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'INTAKE_LINK_EXPIRED' || err.status === 410)) {
        args.setExpired(true);
      } else {
        args.setSubmitError(toUiApiErrorMessage(err));
      }
    } finally {
      args.setSubmitting(false);
    }
  }, [args]);

  return { submitNlIngress, confirmSubmit };
}
