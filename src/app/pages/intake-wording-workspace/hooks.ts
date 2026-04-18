import { useCallback } from 'react';
import { emitDraftSaved, emitPublished, emitRollback } from './services';
import { formatIntakeWordingPublishPartialMessage, INTAKE_WORDING_WORKSPACE_COPY as W } from '../../config/intake-wording-workspace-copy';
import type { Dispatch, SetStateAction } from 'react';

type SyncStatus = 'idle' | 'ok' | 'error';

type UseWorkspaceActionsParams = {
  selectedDraftId: string;
  draftText: string;
  wordingDrafts: Record<string, string>;
  allPlanIds: string[];
  setWordingDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  setDraftText: (value: string) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setInfoMessage: (message: string | null) => void;
  syncToServer: (drafts: Record<string, string>, skipTelemetry?: boolean) => Promise<unknown>;
  publishWording: (questionIds: string[]) => Promise<{ applied_to?: string[] }>;
  rollbackWording: (questionIds: string[]) => Promise<{ applied_to?: string[]; drafts: Record<string, string> }>;
  refreshPublicationLog: () => Promise<void>;
};

export function useWorkspaceActions(params: UseWorkspaceActionsParams) {
  const {
    selectedDraftId,
    draftText,
    wordingDrafts,
    allPlanIds,
    setWordingDrafts,
    setDraftText,
    setSyncStatus,
    setInfoMessage,
    syncToServer,
    publishWording,
    rollbackWording,
    refreshPublicationLog,
  } = params;

  const saveDraftLocal = useCallback(() => {
    if (!selectedDraftId) return;
    const nextText = draftText.trim();
    setWordingDrafts(prev => {
      const next = { ...prev };
      if (nextText) next[selectedDraftId] = nextText;
      else delete next[selectedDraftId];
      return next;
    });
    emitDraftSaved(selectedDraftId);
  }, [selectedDraftId, draftText, setWordingDrafts]);

  const revertEditor = useCallback(() => {
    setDraftText(wordingDrafts[selectedDraftId] ?? '');
  }, [selectedDraftId, setDraftText, wordingDrafts]);

  const syncServer = useCallback(() => {
    const nextText = draftText.trim();
    const snapshot = { ...wordingDrafts };
    if (nextText) snapshot[selectedDraftId] = nextText;
    else delete snapshot[selectedDraftId];
    setWordingDrafts(snapshot);
    void syncToServer(snapshot, false)
      .then(() => {
        setSyncStatus('ok');
      })
      .catch(() => setSyncStatus('error'));
  }, [draftText, selectedDraftId, setSyncStatus, setWordingDrafts, syncToServer, wordingDrafts]);

  const publishSelected = useCallback(() => {
    void publishWording([selectedDraftId])
      .then(res => {
        const count = res.applied_to?.length ?? 0;
        emitPublished(count);
        setSyncStatus(count > 0 ? 'ok' : 'error');
        if (count === 0) {
          setInfoMessage(W.info.nothingPublished);
        }
      })
      .then(() => {
        void refreshPublicationLog();
      })
      .catch(() => setSyncStatus('error'));
  }, [publishWording, refreshPublicationLog, selectedDraftId, setInfoMessage, setSyncStatus]);

  const rollbackSelected = useCallback(() => {
    void rollbackWording([selectedDraftId])
      .then(res => {
        const count = res.applied_to?.length ?? 0;
        emitRollback(count);
        setDraftText(res.drafts[selectedDraftId] ?? '');
        setSyncStatus(count > 0 ? 'ok' : 'error');
        if (count === 0) {
          setInfoMessage(W.info.noRollback);
        }
      })
      .then(() => {
        void refreshPublicationLog();
      })
      .catch(() => setSyncStatus('error'));
  }, [refreshPublicationLog, rollbackWording, selectedDraftId, setDraftText, setInfoMessage, setSyncStatus]);

  const publishAllInPlan = useCallback(() => {
    const ids = allPlanIds.filter(id => (wordingDrafts[id] ?? '').trim().length > 0);
    if (ids.length === 0) {
      setInfoMessage(W.info.noDraftsToPublish);
      return;
    }
    void publishWording(ids)
      .then(res => {
        const count = res.applied_to?.length ?? 0;
        emitPublished(count);
        setSyncStatus('ok');
        if (count < ids.length) {
          setInfoMessage(
            formatIntakeWordingPublishPartialMessage(W.info.publishPartial, count, ids.length),
          );
        }
      })
      .then(() => {
        void refreshPublicationLog();
      })
      .catch(() => setSyncStatus('error'));
  }, [allPlanIds, publishWording, refreshPublicationLog, setInfoMessage, setSyncStatus, wordingDrafts]);

  return {
    saveDraftLocal,
    revertEditor,
    syncServer,
    publishSelected,
    rollbackSelected,
    publishAllInPlan,
  };
}
