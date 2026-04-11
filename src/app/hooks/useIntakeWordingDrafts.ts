import { useCallback, useEffect, useState } from 'react';
import { API_PATHS } from '../config/api-paths';
import { apiFetch } from '../data/api-http';

const LOCAL_STORAGE_KEY = 'intake_trace_wording_drafts_v1';

type WordingApiOk = {
  ok: true;
  drafts: Record<string, string>;
  published?: Record<string, string>;
  applied_to?: string[];
};

function readLocalDrafts(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string') out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function writeLocalDrafts(next: Record<string, string>): void {
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Hydrates from local storage, merges server drafts (server wins per key), persists edits locally immediately.
 * Published wording is server-only (no localStorage).
 */
export function useIntakeWordingDrafts() {
  const [drafts, setDraftsInternal] = useState<Record<string, string>>({});
  const [published, setPublished] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);

  const applyDraftsAndPublished = useCallback((nextDrafts: Record<string, string>, nextPublished: Record<string, string>) => {
    writeLocalDrafts(nextDrafts);
    setDraftsInternal(nextDrafts);
    setPublished(nextPublished);
  }, []);

  const setDrafts = useCallback((updater: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => {
    setDraftsInternal(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      writeLocalDrafts(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const local = readLocalDrafts();
    setDraftsInternal(local);

    apiFetch<WordingApiOk>(API_PATHS.intakeWordingDrafts)
      .then(res => {
        const mergedDrafts = { ...local, ...res.drafts };
        const pub = res.published ?? {};
        applyDraftsAndPublished(mergedDrafts, pub);
      })
      .catch(() => {
        // keep local-only when API unavailable
      })
      .finally(() => {
        setHydrated(true);
      });
  }, [applyDraftsAndPublished]);

  const syncToServer = useCallback(async (snapshot: Record<string, string>, replaceAll = false) => {
    const res = await apiFetch<WordingApiOk>(API_PATHS.intakeWordingDrafts, {
      method: 'PUT',
      body: JSON.stringify({ drafts: snapshot, replace_all: replaceAll }),
    });
    applyDraftsAndPublished(res.drafts, res.published ?? {});
    return res.drafts;
  }, [applyDraftsAndPublished]);

  const publishWording = useCallback(
    async (questionIds?: string[]) => {
      const res = await apiFetch<WordingApiOk>(API_PATHS.intakeWordingDraftsPublish, {
        method: 'POST',
        body: JSON.stringify(questionIds?.length ? { question_ids: questionIds } : {}),
      });
      applyDraftsAndPublished(res.drafts, res.published ?? {});
      return res;
    },
    [applyDraftsAndPublished],
  );

  const rollbackWording = useCallback(
    async (questionIds?: string[]) => {
      const res = await apiFetch<WordingApiOk>(API_PATHS.intakeWordingDraftsRollback, {
        method: 'POST',
        body: JSON.stringify(questionIds?.length ? { question_ids: questionIds } : {}),
      });
      applyDraftsAndPublished(res.drafts, res.published ?? {});
      return res;
    },
    [applyDraftsAndPublished],
  );

  return { drafts, published, setDrafts, hydrated, syncToServer, publishWording, rollbackWording };
}
