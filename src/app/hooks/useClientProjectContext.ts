import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../data/apiService';
import type {
  ClientProjectAuditEnrichmentV1,
  ClientProjectContextV1,
} from '../data/audit/contracts/client-project-context.types';

const BRIEF_SYNC_DEBOUNCE_MS = 1200;

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'ready';
      context: ClientProjectContextV1 | null;
      precheck: ClientProjectAuditEnrichmentV1;
      /** True while a background refetch runs; keep showing last data. */
      isRefreshing?: boolean;
    }
  | { status: 'error'; message: string };

/**
 * Loads composed {@link ClientProjectContextV1}. Fetches when `auditId` is bound, on `refetch()`,
 * and on debounced `briefSyncKey` changes (so refetched `saveBrief` data appears).
 * Optional `refetchIntervalMs` polls (e.g. new-audit site check step before the first brief save).
 *
 * After the first successful load for an `auditId`, subsequent fetches use stale-while-revalidate:
 * status stays `ready` instead of flipping to `loading`, so UI does not flash over existing data.
 *
 * `isRefreshing` is set only when the user triggers `refetch()` (e.g. refresh button). Interval polling
 * and debounced `briefSyncKey` updates fetch in the background without `isRefreshing`, so the panel
 * does not show a perpetual “checking for updates” line.
 */
export function useClientProjectContext(params: {
  auditId: string | null;
  enabled: boolean;
  /** Usually `JSON.stringify(responses)` — debounced. */
  briefSyncKey: string;
  refetchIntervalMs?: number;
}): { state: State; refetch: () => void } {
  const [state, setState] = useState<State>({ status: 'idle' });
  const [fetchGeneration, setFetchGeneration] = useState(0);
  const skipNextBriefDebounce = useRef(true);
  /** Last audit id for which we successfully stored `ready` (enables background refresh without loading flash). */
  const lastSuccessAuditIdRef = useRef<string | null>(null);
  /** Set only by `refetch()` so we show `isRefreshing` for manual refresh, not for pollers. */
  const userInitiatedRefetchRef = useRef(false);

  const refetch = useCallback(() => {
    userInitiatedRefetchRef.current = true;
    setFetchGeneration(n => n + 1);
  }, []);

  useEffect(() => {
    skipNextBriefDebounce.current = true;
  }, [params.auditId]);

  useEffect(() => {
    if (!params.enabled || !params.auditId) {
      lastSuccessAuditIdRef.current = null;
      return;
    }
    setFetchGeneration(n => n + 1);
  }, [params.enabled, params.auditId]);

  useEffect(() => {
    if (!params.refetchIntervalMs || !params.enabled || !params.auditId) {
      return;
    }
    const id = window.setInterval(() => {
      setFetchGeneration(n => n + 1);
    }, params.refetchIntervalMs);
    return () => window.clearInterval(id);
  }, [params.refetchIntervalMs, params.enabled, params.auditId]);

  useEffect(() => {
    if (!params.enabled || !params.auditId) {
      return;
    }
    if (skipNextBriefDebounce.current) {
      skipNextBriefDebounce.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      setFetchGeneration(n => n + 1);
    }, BRIEF_SYNC_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [params.briefSyncKey, params.enabled, params.auditId]);

  useEffect(() => {
    if (!params.enabled || !params.auditId) {
      setState({ status: 'idle' });
      lastSuccessAuditIdRef.current = null;
      return;
    }
    const auditId = params.auditId;
    const canReuseStale = lastSuccessAuditIdRef.current === auditId;

    if (canReuseStale) {
      if (userInitiatedRefetchRef.current) {
        userInitiatedRefetchRef.current = false;
        setState(s =>
          s.status === 'ready' ? { ...s, isRefreshing: true } : { status: 'loading' },
        );
      }
    } else {
      userInitiatedRefetchRef.current = false;
      setState({ status: 'loading' });
    }

    let cancelled = false;
    (async () => {
      try {
        const { context, precheck } = await api.getClientProjectContext(auditId);
        if (!cancelled) {
          lastSuccessAuditIdRef.current = auditId;
          setState({
            status: 'ready',
            context,
            precheck: precheck ?? {},
            isRefreshing: false,
          });
        }
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Request failed';
        if (!cancelled) {
          setState(s => {
            if (s.status === 'ready' && lastSuccessAuditIdRef.current === auditId) {
              return { ...s, isRefreshing: false };
            }
            return { status: 'error', message: msg };
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.enabled, params.auditId, fetchGeneration]);

  return { state, refetch };
}
