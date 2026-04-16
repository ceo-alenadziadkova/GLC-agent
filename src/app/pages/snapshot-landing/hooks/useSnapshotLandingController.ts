import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { setPendingSnapshotToken } from '../../../lib/snapshot-pending-token';
import { toUiErrorMessage } from '../../../lib/snapshot-api-errors';
import {
  SNAPSHOT_LANDING_COPY,
  SNAPSHOT_LANDING_PHASE_LABEL_INTERVAL_MS,
  SNAPSHOT_LANDING_POLL_FAILURE_THRESHOLD,
  SNAPSHOT_LANDING_POLL_INTERVAL_MS,
} from '../../../lib/snapshot-polling-config';
import { PHASE_LABELS } from '../../../lib/snapshot-landing-helpers';
import type { FreeSnapshotPreview } from '../../../data/auditTypes';
import {
  fetchSnapshotStatus,
  getQuotaPreview,
  startSnapshot,
} from '../services/snapshotLandingClient';
import { useSnapshotAuthSession } from './useSnapshotAuthSession';
import { useSnapshotPolling } from './useSnapshotPolling';

export type SnapshotLandingStage = 'idle' | 'submitting' | 'running' | 'done' | 'error';

type RateLimitDetail = { limit: number; remaining: number };
type QuotaPreview = { remaining: number; limit: number };

export function useSnapshotLandingController() {
  const [url, setUrl] = useState('');
  const [stage, setStage] = useState<SnapshotLandingStage>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [quotaHint, setQuotaHint] = useState('');
  const [rateLimitDetail, setRateLimitDetail] = useState<RateLimitDetail | null>(null);
  const [result, setResult] = useState<FreeSnapshotPreview | null>(null);
  const [phaseIdx, setPhaseIdx] = useState(0);

  const tokenRef = useRef<string>('');

  const [quotaPreview, setQuotaPreview] = useState<QuotaPreview | null>(null);
  const accountUser = useSnapshotAuthSession();

  const refreshQuotaPreview = useCallback(async () => {
    const data = await getQuotaPreview();
    if (data) setQuotaPreview({ remaining: data.remaining, limit: data.limit });
  }, []);

  useEffect(() => {
    void refreshQuotaPreview();
  }, []);

  // Cycle through phase labels while running.
  useEffect(() => {
    if (stage !== 'running') return;
    const t = setInterval(() => {
      setPhaseIdx(i => (i + 1) % PHASE_LABELS.length);
    }, SNAPSHOT_LANDING_PHASE_LABEL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [stage]);

  const pollSnapshotStatus = useCallback(async (signal: AbortSignal) => {
    const statusRes = await fetchSnapshotStatus(tokenRef.current, { signal });
    if (!statusRes.ok) {
      return {
        kind: 'error' as const,
        message: toUiErrorMessage(
          statusRes.status,
          statusRes.payload,
          SNAPSHOT_LANDING_COPY.loadStatusDefaultHint,
        ),
      };
    }

    const data = statusRes.data;
    if (data.status === 'completed') {
      return { kind: 'success' as const, data, done: true };
    }
    if (data.status === 'failed') {
      return {
        kind: 'error' as const,
        message: SNAPSHOT_LANDING_COPY.analysisFailedOnServer,
      };
    }
    return { kind: 'success' as const, data: null, done: false };
  }, []);

  useSnapshotPolling<FreeSnapshotPreview | null>({
    enabled: stage === 'running',
    intervalMs: SNAPSHOT_LANDING_POLL_INTERVAL_MS,
    failureThreshold: SNAPSHOT_LANDING_POLL_FAILURE_THRESHOLD,
    poll: pollSnapshotStatus,
    onData: data => {
      if (data) setResult(data);
    },
    onDone: () => setStage('done'),
    onFailureThresholdReached: message => {
      setErrorMsg(message || SNAPSHOT_LANDING_COPY.pollStatusGenericError);
      setStage('error');
    },
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setStage('submitting');
    setErrorMsg('');
    setRateLimitDetail(null);

    try {
      const startRes = await startSnapshot(trimmed);
      if (!startRes.ok) {
        setErrorMsg(toUiErrorMessage(
          startRes.status,
          startRes.payload,
          SNAPSHOT_LANDING_COPY.startAnalysisDefaultHint,
        ));

        if (startRes.status === 429 && startRes.rateLimitFromPayload) {
          setRateLimitDetail(startRes.rateLimitFromPayload);
        }

        void refreshQuotaPreview();
        setStage('error');
        return;
      }

      if (startRes.rateLimitHeaders) {
        setQuotaHint(`${startRes.rateLimitHeaders.remaining} of ${startRes.rateLimitHeaders.limit} free checks left today on this connection.`);
      } else {
        setQuotaHint('');
      }

      const st = startRes.snapshotToken;
      tokenRef.current = st;
      if (st) setPendingSnapshotToken(st);
      void refreshQuotaPreview();
      setStage('running');
    } catch {
      setErrorMsg(SNAPSHOT_LANDING_COPY.startNetworkError);
      setStage('error');
    }
  }

  function reset() {
    setStage('idle');
    setResult(null);
    setErrorMsg('');
    setQuotaHint('');
    setRateLimitDetail(null);
    setUrl('');
    setPhaseIdx(0);
    void refreshQuotaPreview();
  }

  const api = {
    url,
    setUrl,
    stage,
    errorMsg,
    quotaHint,
    rateLimitDetail,
    result,
    phaseIdx,
    quotaPreview,
    accountUser,
    handleSubmit,
    reset,
  };

  return api;
}

