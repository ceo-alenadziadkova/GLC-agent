import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../data/apiService';
import type { PipelineEvent } from '../data/auditTypes';

interface PipelineState {
  status: string;
  current_phase: number;
  tokens_used: number;
  token_budget: number;
  /** Present when loaded from GET /pipeline/status. */
  product_mode?: string;
  events: PipelineEvent[];
  reviews: Array<{ after_phase: number; status: string; consultant_notes: string | null; interview_notes: string | null }>;
}

export function usePipeline(auditId: string | undefined) {
  const [state, setState] = useState<PipelineState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load initial state
  const load = useCallback(async () => {
    if (!auditId) return;
    setLoading(true);
    try {
      const data = await api.getPipelineStatus(auditId);
      setState(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
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
              events: [newEvent, ...prev.events].slice(0, 100),
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
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }, [auditId, load]);

  const runNextPhase = useCallback(async () => {
    if (!auditId) return;
    try {
      await api.runNextPhase(auditId);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }, [auditId, load]);

  const retryPhase = useCallback(async (phase: number) => {
    if (!auditId) return;
    try {
      await api.retryPhase(auditId, phase);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }, [auditId, load]);

  const approveReview = useCallback(async (phase: number, consultantNotes?: string, interviewNotes?: string) => {
    if (!auditId) return;
    try {
      await api.approveReview(auditId, phase, consultantNotes, interviewNotes);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }, [auditId, load]);

  return {
    state,
    loading,
    error,
    reload: load,
    startPipeline,
    runNextPhase,
    retryPhase,
    approveReview,
  };
}
