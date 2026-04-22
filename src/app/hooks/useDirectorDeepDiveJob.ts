import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../data/apiService';
import type { DomainKey } from '../data/auditTypes';
import { ORCHESTRATION_UI_LIMITS } from '../config/orchestration-ui-limits';

type DeepDiveJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'dead_letter';
type DeepDiveQaBlock = {
  coherence: string;
  feasibility: string;
  top_3_actions: string[];
  risks: string[];
  measurement: string[];
};

export function useDirectorDeepDiveJob(args: { jobId: string | null; auditId: string; domainKey: DomainKey }) {
  const { jobId, auditId, domainKey } = args;
  const [status, setStatus] = useState<DeepDiveJobStatus | null>(null);
  const [qaBlock, setQaBlock] = useState<DeepDiveQaBlock | null>(null);

  useEffect(() => {
    if (!jobId) return;
    setStatus(null);
    setQaBlock(null);
    const channel = supabase
      .channel(`director-deep-dive-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'job_runs',
          filter: `queue_job_id=eq.${jobId}`,
        },
        (payload) => {
          const row = payload.new as {
            status?: DeepDiveJobStatus;
            metadata?: { qa_block?: DeepDiveQaBlock };
          };
          if (row.status) setStatus(row.status);
          if (row.metadata?.qa_block) setQaBlock(row.metadata.qa_block);
        },
      )
      .subscribe();

    // Realtime updates may be delayed; poll the status endpoint as a safety net.
    let attempts = 0;
    const pollTimer = window.setInterval(() => {
      attempts += 1;
      void api
        .getDirectorDeepDiveStatus(auditId, domainKey, jobId)
        .then((result) => {
          setStatus(result.status);
          if (result.qa_block) setQaBlock(result.qa_block);
          if (
            result.status === 'completed' ||
            result.status === 'failed' ||
            result.status === 'dead_letter'
          ) {
            window.clearInterval(pollTimer);
          }
        })
        .catch(() => {
          if (attempts >= ORCHESTRATION_UI_LIMITS.deepDiveStatusPollMaxAttempts) {
            window.clearInterval(pollTimer);
          }
        });
      if (attempts >= ORCHESTRATION_UI_LIMITS.deepDiveStatusPollMaxAttempts) {
        window.clearInterval(pollTimer);
      }
    }, ORCHESTRATION_UI_LIMITS.deepDiveStatusPollIntervalMs);

    return () => {
      window.clearInterval(pollTimer);
      channel.unsubscribe();
    };
  }, [auditId, domainKey, jobId]);

  return { status, qaBlock };
}
