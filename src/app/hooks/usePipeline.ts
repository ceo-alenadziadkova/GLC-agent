import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { supabase } from '../lib/supabase';
import { api } from '../data/apiService';
import { ApiError } from '../data/api-error';
import type { PipelineEvent } from '../data/auditTypes';
import { getGlcQueryClient } from '../lib/glc-query-client';
import { invalidateAuditRelatedQueries, invalidateAuditsListsAndDashboard } from '../lib/glc-invalidate-queries';
import { UI_POLICY } from '../config/ui-policy';
import { toUiApiErrorMessage } from '../lib/api-error-ui';
import { isPipelineAuditActiveStatus } from '../lib/pipeline-monitor-helpers';
import {
  buildPipelineRealtimeAuditsUpdateSubscribe,
  buildPipelineRealtimeEventsInsertSubscribe,
  parseAuditsRealtimePatch,
  parsePipelineEventInsertPayload,
  type PipelineRealtimePostgresChangePayload,
} from '../config/pipeline-realtime-schema';
import { comparePipelineEventsNewestFirst } from '../lib/pipeline-event-sort';

/** Server `API_ERROR_CODES.PIPELINE_NEXT_CLAIM_CONFLICT` — optimistic-lock / concurrent next. */
const PIPELINE_NEXT_CLAIM_CONFLICT_CODE = 'PIPELINE_NEXT_CLAIM_CONFLICT';

export type PipelineErrorExtras = {
  code?: string;
  details: unknown;
};

interface PipelineState {
  status: string;
  current_phase: number;
  tokens_used: number;
  token_budget: number;
  execution_plan?: {
    selected_domains: string[];
    depth: string;
    source: string;
    coverage_package?: 'starter' | 'pro' | 'complete';
    include_strategy?: boolean;
  } | null;
  events: PipelineEvent[];
  reviews: Array<{ after_phase: number; status: string; consultant_notes: string | null; interview_notes: string | null }>;
  event_page?: { limit: number; next_before: string | null; detail_level: 'default' | 'debug' };
}

/**
 * Loads pipeline status, paginates events, and subscribes to Realtime inserts on `pipeline_events`
 * plus `audits` updates for the given audit id.
 *
 * **Subscriptions:** the Supabase channel is created only when `auditId` changes — not when the
 * `load` callback identity changes. Query shape (`detailLevel`, `eventLimit`) is normalized via
 * `pipelineQueryOpts` so refetches track those primitives without tearing down Realtime.
 *
 * **Audit navigation:** on `auditId` change, `useLayoutEffect` clears errors, pipeline snapshot, and
 * `runNextPhaseBusy` before paint, and invalidates in-flight `getPipelineStatus` results so stale
 * payloads cannot repopulate state after route change.
 */
export function usePipeline(
  auditId: string | undefined,
  options?: { detailLevel?: 'default' | 'debug'; eventLimit?: number },
) {
  const pipelineQueryOpts = useMemo(
    () => ({
      detailLevel: (options?.detailLevel ?? 'default') as 'default' | 'debug',
      eventLimit: options?.eventLimit,
      maxEventsInMemory: UI_POLICY.pipeline.maxEventsInMemory,
    }),
    [options?.detailLevel, options?.eventLimit],
  );

  /** Single primitive key so refetch deps stay aligned when new option fields affect GET /pipeline/status. */
  const pipelineReloadDepsKey = useMemo(
    () =>
      `${pipelineQueryOpts.detailLevel}|${pipelineQueryOpts.eventLimit ?? ''}|${pipelineQueryOpts.maxEventsInMemory}`,
    [
      pipelineQueryOpts.detailLevel,
      pipelineQueryOpts.eventLimit,
      pipelineQueryOpts.maxEventsInMemory,
    ],
  );

  const [state, setState] = useState<PipelineState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Structured API error from the last failed pipeline load or mutation (for example intake readiness `details`). */
  const [pipelineErrorExtras, setPipelineErrorExtras] = useState<PipelineErrorExtras | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const stateRef = useRef<PipelineState | null>(null);
  const loadRequestIdRef = useRef(0);
  const auditIdForLoadingRef = useRef<string | undefined>(auditId);
  const runNextPhaseInFlightRef = useRef(false);
  /** UI: POST /pipeline/next in flight (server may still show `review` until claim + orchestrator update land). */
  const [runNextPhaseBusy, setRunNextPhaseBusy] = useState(false);
  // Sync before paint so event handlers (e.g. loadMoreEvents) see the latest committed pipeline snapshot.
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  const captureFailure = useCallback((err: unknown) => {
    if (err instanceof ApiError) {
      setError(toUiApiErrorMessage(err));
      setPipelineErrorExtras({ code: err.code, details: err.details ?? null });
      return;
    }
    setError(err instanceof Error && err.message.trim() ? err.message : toUiApiErrorMessage(err));
    setPipelineErrorExtras(null);
  }, []);

  const clearFailure = useCallback(() => {
    setError(null);
    setPipelineErrorExtras(null);
  }, []);

  // Before paint when `auditId` changes: drop stale snapshot, clear errors, and invalidate in-flight loads
  // so a slow GET for the previous audit cannot call setState after navigation.
  useLayoutEffect(() => {
    const idChanged = auditIdForLoadingRef.current !== auditId;
    auditIdForLoadingRef.current = auditId;

    runNextPhaseInFlightRef.current = false;
    setRunNextPhaseBusy(false);
    clearFailure();

    if (!auditId) {
      setState(null);
      setLoading(false);
      if (idChanged) loadRequestIdRef.current += 1;
      return;
    }
    if (idChanged) loadRequestIdRef.current += 1;
    setState(null);
    setLoading(true);
  }, [auditId, clearFailure]);

  // Refresh pipeline snapshot from GET /pipeline/status for the current audit.
  const load = useCallback(async (): Promise<PipelineState | null> => {
    if (!auditId) return null;
    const requestId = ++loadRequestIdRef.current;
    setLoading(true);
    try {
      const data = await api.getPipelineStatus(auditId, {
        detail_level: pipelineQueryOpts.detailLevel,
        limit: pipelineQueryOpts.eventLimit ?? pipelineQueryOpts.maxEventsInMemory,
      });
      if (requestId !== loadRequestIdRef.current) return null;
      setState(data);
      clearFailure();
      return data as PipelineState;
    } catch (err) {
      if (requestId === loadRequestIdRef.current) {
        captureFailure(err);
      }
      return null;
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [
    auditId,
    captureFailure,
    clearFailure,
    pipelineQueryOpts.detailLevel,
    pipelineQueryOpts.eventLimit,
    pipelineQueryOpts.maxEventsInMemory,
  ]);

  const loadRef = useRef(load);
  loadRef.current = load;

  const maxEventsInMemoryRef = useRef(pipelineQueryOpts.maxEventsInMemory);
  maxEventsInMemoryRef.current = pipelineQueryOpts.maxEventsInMemory;

  // Fetch when audit id or query shape changes — without tearing down the Realtime channel when only `load` identity changes.
  // Errors are cleared on audit change in the layout-effect above (`clearFailure`); this effect only refetches.
  useEffect(() => {
    if (!auditId) return;
    void loadRef.current();
  }, [auditId, pipelineReloadDepsKey]);

  // Subscribe to realtime pipeline events (lifecycle tied to auditId only).
  useEffect(() => {
    if (!auditId) return;

    /**
     * While the first `load()` is in flight, `state` is null but the pipeline may already emit
     * rows. Previously we dropped those Realtime payloads (`if (!prev) return prev`), so the UI
     * stayed stale until a full page refresh. Coalesce refetches so a burst of events triggers
     * at most one overlapping GET.
     */
    let catchupReloadInFlight = false;
    const scheduleCatchupReloadWhileSnapshotEmpty = () => {
      if (catchupReloadInFlight) return;
      catchupReloadInFlight = true;
      void loadRef.current().finally(() => {
        catchupReloadInFlight = false;
      });
    };

    const channel = supabase
      .channel(`pipeline-${auditId}`)
      .on(
        'postgres_changes',
        buildPipelineRealtimeEventsInsertSubscribe(auditId),
        (payload: PipelineRealtimePostgresChangePayload) => {
          const newEvent = parsePipelineEventInsertPayload(payload.new);
          if (!newEvent) return;
          setState(prev => {
            if (!prev) {
              scheduleCatchupReloadWhileSnapshotEmpty();
              return prev;
            }
            const cap = maxEventsInMemoryRef.current;
            return {
              ...prev,
              events: [newEvent, ...prev.events]
                .sort(comparePipelineEventsNewestFirst)
                .slice(0, cap),
            };
          });
        }
      )
      .on(
        'postgres_changes',
        buildPipelineRealtimeAuditsUpdateSubscribe(auditId),
        (payload: PipelineRealtimePostgresChangePayload) => {
          const updated = parseAuditsRealtimePatch(payload.new);
          if (!updated) return;
          setState(prev => {
            if (!prev) {
              scheduleCatchupReloadWhileSnapshotEmpty();
              return prev;
            }
            return {
              ...prev,
              ...(updated.status !== undefined ? { status: updated.status } : {}),
              ...(updated.current_phase !== undefined ? { current_phase: updated.current_phase } : {}),
              ...(updated.tokens_used !== undefined ? { tokens_used: updated.tokens_used } : {}),
            };
          });
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [auditId]);

  // Actions
  const startPipeline = useCallback(async () => {
    if (!auditId) return;
    try {
      await api.startPipeline(auditId);
      const qc = getGlcQueryClient();
      invalidateAuditRelatedQueries(qc, auditId);
      invalidateAuditsListsAndDashboard(qc);
      await load();
    } catch (err) {
      captureFailure(err);
    }
  }, [auditId, captureFailure, load]);

  const runNextPhase = useCallback(async () => {
    if (!auditId) return;
    // Single-flight: read + assign synchronously before any await (same JS turn = atomic vs double-submit).
    if (runNextPhaseInFlightRef.current) return;
    runNextPhaseInFlightRef.current = true;
    flushSync(() => {
      setRunNextPhaseBusy(true);
    });
    try {
      await api.runNextPhase(auditId);
      const qc = getGlcQueryClient();
      invalidateAuditRelatedQueries(qc, auditId);
      invalidateAuditsListsAndDashboard(qc);
      await load();
    } catch (err) {
      const claimConflict =
        err instanceof ApiError &&
        err.status === 409 &&
        err.code === PIPELINE_NEXT_CLAIM_CONFLICT_CODE;
      if (claimConflict) {
        const fresh = await load();
        if (fresh && isPipelineAuditActiveStatus(fresh.status)) {
          const qc = getGlcQueryClient();
          invalidateAuditRelatedQueries(qc, auditId);
          invalidateAuditsListsAndDashboard(qc);
          return;
        }
      }
      captureFailure(err);
    } finally {
      runNextPhaseInFlightRef.current = false;
      setRunNextPhaseBusy(false);
    }
  }, [auditId, captureFailure, load]);

  const stopPipeline = useCallback(async () => {
    if (!auditId) return;
    try {
      await api.stopPipeline(auditId);
      const qc = getGlcQueryClient();
      invalidateAuditRelatedQueries(qc, auditId);
      invalidateAuditsListsAndDashboard(qc);
      await load();
    } catch (err) {
      captureFailure(err);
    }
  }, [auditId, captureFailure, load]);

  const retryPhase = useCallback(async (phase: number, opts?: { retry_comment?: string }) => {
    if (!auditId) return;
    try {
      await api.retryPhase(auditId, phase, opts);
      const qc = getGlcQueryClient();
      invalidateAuditRelatedQueries(qc, auditId);
      invalidateAuditsListsAndDashboard(qc);
      await load();
    } catch (err) {
      captureFailure(err);
    }
  }, [auditId, captureFailure, load]);

  const approveReview = useCallback(async (
    phase: number,
    consultantNotes?: string,
    interviewNotes?: string,
    action: 'approve' | 'request_missing_data' = 'approve',
  ) => {
    if (!auditId) return false;
    try {
      await api.approveReview(auditId, phase, consultantNotes, interviewNotes, action);
      const qc = getGlcQueryClient();
      invalidateAuditRelatedQueries(qc, auditId);
      invalidateAuditsListsAndDashboard(qc);
      await load();
      return true;
    } catch (err) {
      captureFailure(err);
      return false;
    }
  }, [auditId, captureFailure, load]);

  const loadMoreEvents = useCallback(async () => {
    if (!auditId || !stateRef.current?.event_page?.next_before) return;
    const next = await api.getPipelineStatus(auditId, {
      detail_level: pipelineQueryOpts.detailLevel,
      limit: pipelineQueryOpts.eventLimit ?? pipelineQueryOpts.maxEventsInMemory,
      before: stateRef.current.event_page.next_before,
    });
    setState(prev => {
      if (!prev) return prev;
      const merged = [...prev.events, ...next.events].sort(comparePipelineEventsNewestFirst);
      return {
        ...prev,
        ...next,
        events: merged.slice(0, pipelineQueryOpts.maxEventsInMemory),
      };
    });
  }, [
    auditId,
    pipelineQueryOpts.detailLevel,
    pipelineQueryOpts.eventLimit,
    pipelineQueryOpts.maxEventsInMemory,
  ]);

  return {
    state,
    loading,
    error,
    pipelineErrorExtras,
    runNextPhaseBusy,
    reload: load,
    startPipeline,
    runNextPhase,
    stopPipeline,
    retryPhase,
    approveReview,
    loadMoreEvents,
  };
}
