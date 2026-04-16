import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../data/apiService';
import type { PipelineEvent } from '../data/auditTypes';
import { getGlcQueryClient } from '../lib/glc-query-client';
import { invalidateAuditRelatedQueries } from '../lib/glc-invalidate-queries';
import { UI_POLICY } from '../config/ui-policy';
import { toUiApiErrorMessage } from '../lib/api-error-ui';

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
}

export function usePipeline(auditId: string | undefined) {
  const [state, setState] = useState<PipelineState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const stateRef = useRef<PipelineState | null>(null);
  const loadRequestIdRef = useRef(0);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Load initial state (only block UI when we have no cached pipeline snapshot yet)
  const load = useCallback(async () => {
    if (!auditId) return;
    const initialEmpty = stateRef.current === null;
    if (initialEmpty) setLoading(true);
    try {
      const requestId = ++loadRequestIdRef.current;
      const data = await api.getPipelineStatus(auditId);
      if (requestId !== loadRequestIdRef.current) return;
      setState(data);
      setError(null);
    } catch (err) {
      setError(toUiApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  // Subscribe to realtime pipeline events
  useEffect(() => {
    if (!auditId) return;

    load();

    const channel = supabase
      .channel(`pipeline-${auditId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pipeline_events',
          filter: `audit_id=eq.${auditId}`,
        },
        (payload) => {
          const newEvent = payload.new as PipelineEvent;
          setState(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              events: [newEvent, ...prev.events].slice(0, UI_POLICY.pipeline.maxEventsInMemory),
            };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'audits',
          filter: `id=eq.${auditId}`,
        },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          setState(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              status: updated.status as string,
              current_phase: updated.current_phase as number,
              tokens_used: updated.tokens_used as number,
            };
          });
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [auditId, load]);

  // Actions
  const startPipeline = useCallback(async () => {
    if (!auditId) return;
    try {
      await api.startPipeline(auditId);
      invalidateAuditRelatedQueries(getGlcQueryClient(), auditId);
      await load();
    } catch (err) {
      setError(toUiApiErrorMessage(err));
    }
  }, [auditId, load]);

  const runNextPhase = useCallback(async () => {
    if (!auditId) return;
    try {
      await api.runNextPhase(auditId);
      invalidateAuditRelatedQueries(getGlcQueryClient(), auditId);
      await load();
    } catch (err) {
      setError(toUiApiErrorMessage(err));
    }
  }, [auditId, load]);

  const stopPipeline = useCallback(async () => {
    if (!auditId) return;
    try {
      await api.stopPipeline(auditId);
      invalidateAuditRelatedQueries(getGlcQueryClient(), auditId);
      await load();
    } catch (err) {
      setError(toUiApiErrorMessage(err));
    }
  }, [auditId, load]);

  const retryPhase = useCallback(async (phase: number) => {
    if (!auditId) return;
    try {
      await api.retryPhase(auditId, phase);
      invalidateAuditRelatedQueries(getGlcQueryClient(), auditId);
      await load();
    } catch (err) {
      setError(toUiApiErrorMessage(err));
    }
  }, [auditId, load]);

  const approveReview = useCallback(async (phase: number, consultantNotes?: string, interviewNotes?: string) => {
    if (!auditId) return;
    try {
      await api.approveReview(auditId, phase, consultantNotes, interviewNotes);
      invalidateAuditRelatedQueries(getGlcQueryClient(), auditId);
      await load();
    } catch (err) {
      setError(toUiApiErrorMessage(err));
    }
  }, [auditId, load]);

  return {
    state,
    loading,
    error,
    reload: load,
    startPipeline,
    runNextPhase,
    stopPipeline,
    retryPhase,
    approveReview,
  };
}
