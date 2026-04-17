import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AUDIT_WORKSPACE_BRIEF_SAVE_DEBOUNCE_MS,
  AUDIT_WORKSPACE_SAVE_FLASH_MS,
} from '../../../config/ui-feedback-defaults';
import { api } from '../../../data/apiService';
import type { IntakeVersionTuple } from '../../../data/auditTypes';
import type { BriefResponses } from '../../../data/briefQuestions';
import { logger } from '../../../lib/logger';

type SaveOptions = {
  id?: string;
  intakeVersions?: IntakeVersionTuple | null;
  reload: () => void;
};

function useDebouncedBriefSave({ id, intakeVersions, reload }: SaveOptions) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<BriefResponses | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const queueSave = useCallback(
    (next: BriefResponses) => {
      if (!id) return;
      pendingRef.current = next;
      if (timer.current) clearTimeout(timer.current);

      timer.current = setTimeout(() => {
        void (async () => {
          const payload = pendingRef.current;
          pendingRef.current = null;
          if (!id || !payload) return;
          try {
            await api.saveBrief(id, payload, {
              intake_versions: intakeVersions ?? undefined,
            });
            setSavedFlash(true);
            reload();
            window.setTimeout(() => setSavedFlash(false), AUDIT_WORKSPACE_SAVE_FLASH_MS);
          } catch (error) {
            logger.error('[AuditWorkspace] brief save', {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        })();
      }, AUDIT_WORKSPACE_BRIEF_SAVE_DEBOUNCE_MS);
    },
    [id, intakeVersions, reload],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { queueSave, savedFlash };
}

export function useAuditWorkspaceBriefAutosave(options: SaveOptions) {
  const workspace = useDebouncedBriefSave(options);
  const enrichment = useDebouncedBriefSave(options);

  const queueFollowupBriefSave = useCallback(
    (
      qid: string,
      value: string | string[] | number | null,
      source: 'consultant' | 'unknown' = 'consultant',
      base: BriefResponses,
    ) => {
      const next: BriefResponses = {
        ...base,
        [qid]: { value, source },
      };
      enrichment.queueSave(next);
    },
    [enrichment],
  );

  return {
    workspaceSavedFlash: workspace.savedFlash,
    enrichSaved: enrichment.savedFlash,
    queueWorkspaceSave: workspace.queueSave,
    queueFollowupBriefSave,
  };
}
