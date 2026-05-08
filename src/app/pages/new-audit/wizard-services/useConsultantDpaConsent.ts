import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../../../data/apiService';
import {
  GLC_LEGAL_CONSENTS_UPDATED_WINDOW_EVENT,
  LEGAL_CONSENT_KEYS,
} from '../../../config/legal-consent-client-policy';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';

export function useConsultantDpaConsent(params: {
  isClientSelfServe: boolean;
  userId?: string;
  setError: (message: string | null) => void;
  setLoading: (value: boolean) => void;
}) {
  const [consultantDpaLoading, setConsultantDpaLoading] = useState(() => !params.isClientSelfServe);
  const [consultantDpaOnFile, setConsultantDpaOnFile] = useState(false);
  const [consultantDpaChecked, setConsultantDpaChecked] = useState(false);

  useEffect(() => {
    if (params.isClientSelfServe) {
      setConsultantDpaLoading(false);
      setConsultantDpaOnFile(false);
      return;
    }
    if (!params.userId) {
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
  }, [params.isClientSelfServe, params.userId]);

  const ensureConsultantDpaAccepted = useCallback(async (): Promise<boolean> => {
    if (params.isClientSelfServe) return true;
    if (consultantDpaLoading) return false;
    if (consultantDpaOnFile) return true;
    if (!consultantDpaChecked) {
      params.setError(WORKSPACE_PAGE_COPY.newAudit.step2.dpaConsultantRequired);
      return false;
    }
    params.setLoading(true);
    params.setError(null);
    try {
      await api.postLegalConsents({
        source: 'audit_create',
        events: [{ consent_key: LEGAL_CONSENT_KEYS.dpaAcceptance, accepted: true }],
      });
      window.dispatchEvent(new Event(GLC_LEGAL_CONSENTS_UPDATED_WINDOW_EVENT));
      setConsultantDpaOnFile(true);
      setConsultantDpaChecked(false);
      return true;
    } catch (err) {
      params.setError(
        err instanceof ApiError ? err.message : WORKSPACE_PAGE_COPY.newAudit.step2.dpaConsultantSaveFailed,
      );
      return false;
    } finally {
      params.setLoading(false);
    }
  }, [
    consultantDpaChecked,
    consultantDpaLoading,
    consultantDpaOnFile,
    params,
  ]);

  return {
    consultantDpaLoading,
    consultantDpaOnFile,
    consultantDpaChecked,
    setConsultantDpaChecked,
    ensureConsultantDpaAccepted,
  };
}
