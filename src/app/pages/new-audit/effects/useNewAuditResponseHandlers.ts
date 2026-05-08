import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { APP_FEATURE_FLAGS } from '../../../config/app-feature-flags';
import { api } from '../../../data/apiService';
import type { BriefResponses } from '../../../data/briefQuestions';
import { normalizeServerBriefResponsesForWizard } from '../../../lib/new-audit-brief-state';

export function useNewAuditResponseHandlers(args: {
  responseSource: 'client' | 'consultant' | 'unknown' | 'recon_confirmed';
  setResponses: Dispatch<SetStateAction<BriefResponses>>;
  draftAuditId: string | null;
  bumpClientProjectContextSyncTick: () => void;
}) {
  const handleResponseChange = useCallback(
    (id: string, value: string | string[] | number | null) => {
      args.setResponses(prev => ({ ...prev, [id]: { value, source: args.responseSource } }));
    },
    [args],
  );

  const handleSetUnknown = useCallback(
    (id: string) => {
      args.setResponses(prev => ({ ...prev, [id]: { value: null, source: 'unknown' } }));
    },
    [args],
  );

  const applyMergedBriefServerRowIntoState = useCallback(
    (briefRow: unknown) => {
      const next = normalizeServerBriefResponsesForWizard(briefRow, args.responseSource);
      if (Object.keys(next).length === 0) return;
      args.setResponses(next);
    },
    [args],
  );

  const handleBriefCloneFromAudit = useCallback(
    async (sourceAuditId: string) => {
      if (!args.draftAuditId || !APP_FEATURE_FLAGS.briefCloneFromAuditEnabled) return;
      const merged = await api.postAuditsBriefCloneFrom(args.draftAuditId, { source_audit_id: sourceAuditId });
      applyMergedBriefServerRowIntoState(merged.brief);
      args.bumpClientProjectContextSyncTick();
    },
    [applyMergedBriefServerRowIntoState, args],
  );

  return {
    handleResponseChange,
    handleSetUnknown,
    handleBriefCloneFromAudit,
  };
}
