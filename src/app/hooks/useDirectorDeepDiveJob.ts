import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type DeepDiveJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'dead_letter';

export function useDirectorDeepDiveJob(jobId: string | null) {
  const [status, setStatus] = useState<DeepDiveJobStatus | null>(null);

  useEffect(() => {
    if (!jobId) return;
    setStatus(null);
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
          const row = payload.new as { status?: DeepDiveJobStatus };
          if (row.status) setStatus(row.status);
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [jobId]);

  return { status };
}
