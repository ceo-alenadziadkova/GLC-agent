import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  GLC_LEGAL_CONSENTS_UPDATED_WINDOW_EVENT,
  LEGAL_CONSENT_KEYS,
} from '../../../config/legal-consent-client-policy';
import { SETTINGS_PAGE_COPY } from '../../../config/settings-page-copy.en';
import { api } from '../../../data/apiService';
import type { LegalConsentKey } from '../../../data/api/brief-profile-platform';

function effectiveAccepted(
  effective: Array<{ consent_key: string; accepted: boolean }>,
  key: LegalConsentKey,
): boolean {
  const row = effective.find(e => e.consent_key === key);
  return row?.accepted === true;
}

export function useLegalConsentsSettings(enabled: boolean) {
  const [loading, setLoading] = useState(false);
  const [productAnalytics, setProductAnalytics] = useState(false);
  const [caseStudyUse, setCaseStudyUse] = useState(false);
  const [evaluationInternal, setEvaluationInternal] = useState(false);
  const [dpaAcceptance, setDpaAcceptance] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const body = await api.getLegalConsents();
      setProductAnalytics(effectiveAccepted(body.effective, LEGAL_CONSENT_KEYS.productAnalytics));
      setCaseStudyUse(effectiveAccepted(body.effective, LEGAL_CONSENT_KEYS.caseStudyUse));
      setEvaluationInternal(effectiveAccepted(body.effective, LEGAL_CONSENT_KEYS.evaluationInternal));
      setDpaAcceptance(effectiveAccepted(body.effective, LEGAL_CONSENT_KEYS.dpaAcceptance));
    } catch {
      toast.error(SETTINGS_PAGE_COPY.legalConsents.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const persist = useCallback(async (key: LegalConsentKey, accepted: boolean) => {
    try {
      await api.postLegalConsents({
        source: 'settings',
        events: [{ consent_key: key, accepted }],
      });
      window.dispatchEvent(new Event(GLC_LEGAL_CONSENTS_UPDATED_WINDOW_EVENT));
      toast.success(SETTINGS_PAGE_COPY.legalConsents.saved);
    } catch {
      toast.error(SETTINGS_PAGE_COPY.legalConsents.saveFailed);
      await refresh();
    }
  }, [refresh]);

  return {
    loading,
    productAnalytics,
    caseStudyUse,
    evaluationInternal,
    dpaAcceptance,
    setProductAnalytics: async (next: boolean) => {
      setProductAnalytics(next);
      await persist(LEGAL_CONSENT_KEYS.productAnalytics, next);
    },
    setCaseStudyUse: async (next: boolean) => {
      setCaseStudyUse(next);
      await persist(LEGAL_CONSENT_KEYS.caseStudyUse, next);
    },
    setEvaluationInternal: async (next: boolean) => {
      setEvaluationInternal(next);
      await persist(LEGAL_CONSENT_KEYS.evaluationInternal, next);
    },
    setDpaAcceptance: async (next: boolean) => {
      setDpaAcceptance(next);
      await persist(LEGAL_CONSENT_KEYS.dpaAcceptance, next);
    },
    refresh,
  };
}
