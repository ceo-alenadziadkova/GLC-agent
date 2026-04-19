import { useEffect, useRef } from 'react';

type UseSnapshotPollingParams<TData> = {
  enabled: boolean;
  intervalMs: number;
  failureThreshold: number;
  poll: (signal: AbortSignal) => Promise<
    | { kind: 'success'; data: TData; done: boolean }
    | { kind: 'error'; message: string }
  >;
  onData: (data: TData) => void;
  onDone: () => void;
  onFailureThresholdReached: (message: string) => void;
};

export function useSnapshotPolling<TData>(params: UseSnapshotPollingParams<TData>): void {
  const {
    enabled,
    intervalMs,
    failureThreshold,
    poll,
    onData,
    onDone,
    onFailureThresholdReached,
  } = params;
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollInFlightRef = useRef(false);
  const pollAbortRef = useRef<AbortController | null>(null);
  const pollFailuresRef = useRef(0);

  useEffect(() => {
    const clearPolling = () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
      pollAbortRef.current?.abort();
      pollAbortRef.current = null;
      pollInFlightRef.current = false;
    };

    if (!enabled) {
      clearPolling();
      return;
    }

    let cancelled = false;
    const teardown = () => {
      cancelled = true;
      clearPolling();
    };

    const scheduleNextPoll = () => {
      if (cancelled) return;
      pollTimeoutRef.current = setTimeout(() => {
        void runPoll();
      }, intervalMs);
    };

    const runPoll = async () => {
      if (cancelled || pollInFlightRef.current) return;
      const abortController = new AbortController();
      pollAbortRef.current = abortController;
      pollInFlightRef.current = true;

      try {
        const next = await poll(abortController.signal);
        if (cancelled) return;
        if (next.kind === 'error') {
          pollFailuresRef.current += 1;
          if (pollFailuresRef.current >= failureThreshold) {
            onFailureThresholdReached(next.message);
            return;
          }
          scheduleNextPoll();
          return;
        }

        pollFailuresRef.current = 0;
        onData(next.data);

        if (next.done) {
          onDone();
          return;
        }

        scheduleNextPoll();
      } catch (error) {
        if (cancelled || abortController.signal.aborted) return;
        pollFailuresRef.current += 1;
        const message = error instanceof Error ? error.message : 'Polling failed.';
        if (pollFailuresRef.current >= failureThreshold) {
          onFailureThresholdReached(message);
          return;
        }
        scheduleNextPoll();
      } finally {
        pollInFlightRef.current = false;
      }
    };

    void runPoll();
    return teardown;
  }, [enabled, failureThreshold, intervalMs, onData, onDone, onFailureThresholdReached, poll]);
}
