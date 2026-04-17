import { useEffect } from 'react';
import { api } from '../../../data/apiService';
import type { IntakeVersionTuple } from '../../../data/auditTypes';

export function useDraftIntakeVersionsEffect(params: {
  isClientSelfServe: boolean;
  draftAuditId: string | null;
  setDraftIntakeVersions: (versions: IntakeVersionTuple | null) => void;
}): void {
  useEffect(() => {
    if (!params.isClientSelfServe || !params.draftAuditId) return;
    let cancelled = false;
    (async () => {
      try {
        const { brief } = await api.getBrief(params.draftAuditId);
        if (cancelled || !brief?.intake_versions) return;
        params.setDraftIntakeVersions(brief.intake_versions);
      } catch {
        // Non-blocking metadata sync.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.isClientSelfServe, params.draftAuditId, params.setDraftIntakeVersions]);
}
