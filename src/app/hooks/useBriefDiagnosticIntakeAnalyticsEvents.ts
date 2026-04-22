import { useEffect, useRef } from 'react';
import { api } from '../data/apiService';
import {
  briefTrackGuardQuestionTriggered,
  briefTrackReadinessBlocked,
  briefTrackRemediationAsked,
  briefTrackSignalConfidenceChanged,
  briefTrackSequencingTransitionTaken,
  type BriefIntakeAnalyticsSink,
} from '../lib/brief-intake-analytics';
import {
  BRIEF_ANALYTICS_NEXT_RECOMMENDED_IDS_MAX,
  BRIEF_EXECUTION_DIAGNOSTIC_DEBOUNCE_MS,
} from '../config/client-analytics-batching';

export interface UseBriefDiagnosticIntakeAnalyticsEventsParams {
  auditId: string | null | undefined;
  enabled: boolean;
  responsesFingerprint: string;
  sink: BriefIntakeAnalyticsSink | null;
}

/**
 * Emits ADR diagnostic funnel events from `GET /api/audits/:id/brief` (readiness, critical signals).
 * Complements `useIntakeWizard` question_shown / answered / skipped on the same sink.
 */
export function useBriefDiagnosticIntakeAnalyticsEvents(
  params: UseBriefDiagnosticIntakeAnalyticsEventsParams,
): void {
  const { auditId, enabled, responsesFingerprint, sink } = params;

  const lastReadinessBlockedFpRef = useRef('');
  const lastRemediationFpRef = useRef('');
  const lastNextRecommendedFpRef = useRef('');
  const lastSignalConfidenceByKeyRef = useRef<Record<string, 'high' | 'medium' | 'low' | 'unknown'> | null>(
    null,
  );
  const emittedGuardTraceRef = useRef<Set<string>>(new Set());
  const lastAuditIdRef = useRef<string | null>(null);
  const lastSinkRef = useRef<BriefIntakeAnalyticsSink | null>(null);

  useEffect(() => {
    if (!enabled || !auditId || !sink) return;

    if (lastAuditIdRef.current !== auditId || lastSinkRef.current !== sink) {
      lastAuditIdRef.current = auditId;
      lastSinkRef.current = sink;
      lastReadinessBlockedFpRef.current = '';
      lastRemediationFpRef.current = '';
      lastNextRecommendedFpRef.current = '';
      lastSignalConfidenceByKeyRef.current = null;
      emittedGuardTraceRef.current = new Set();
    }

    let cancelled = false;
    const tid = window.setTimeout(() => {
      void api
        .getBrief(auditId)
        .then(payload => {
          if (cancelled) return;
          if (payload.readiness == null || payload.critical_signals == null) return;

          if (payload.readiness.auditReadinessStatus === 'blocked') {
            const fp = `blocked:${(payload.readiness.trace ?? []).map(t => t.code).join('|')}`;
            if (lastReadinessBlockedFpRef.current !== fp) {
              lastReadinessBlockedFpRef.current = fp;
              briefTrackReadinessBlocked(sink, {
                auditReadinessStatus: payload.readiness.auditReadinessStatus,
                flowReadinessStatus: payload.readiness.flowReadinessStatus as 'flow_ready' | 'blocked',
                traceCodes: (payload.readiness.trace ?? [])
                  .map(t => t.code)
                  .filter((c): c is string => typeof c === 'string' && c.length > 0),
              });
            }
          }
          const rem = payload.remediation_queue ?? [];
          if (rem.length > 0) {
            const remFp = rem.join(',');
            if (lastRemediationFpRef.current !== remFp) {
              lastRemediationFpRef.current = remFp;
              briefTrackRemediationAsked(sink, { bankIds: rem });
            }
          }
          const nr = (payload.next_recommended ?? []).slice(0, BRIEF_ANALYTICS_NEXT_RECOMMENDED_IDS_MAX);
          if (nr.length > 0) {
            const nrFp = nr.join('\u001f');
            if (lastNextRecommendedFpRef.current !== nrFp) {
              lastNextRecommendedFpRef.current = nrFp;
              briefTrackSequencingTransitionTaken(sink, {
                transition_rule_ref: 'pilot_next_recommended',
                next_recommended: nr,
              });
            }
          }
          const signalConfidenceByKey = payload.critical_signals?.by_key ?? null;
          if (signalConfidenceByKey != null) {
            const prevSignals = lastSignalConfidenceByKeyRef.current;
            const keys = Object.keys(signalConfidenceByKey);
            if (prevSignals != null) {
              for (const key of keys) {
                if (prevSignals[key] !== signalConfidenceByKey[key]) {
                  briefTrackSignalConfidenceChanged(sink, { signalKey: key });
                }
              }
            }
            lastSignalConfidenceByKeyRef.current = signalConfidenceByKey;
          }
          const trace = payload.readiness.trace ?? [];
          for (const entry of trace) {
            if (!entry.code.startsWith('sequencing_dep_')) continue;
            if (!entry.questionId) continue;
            const gkey = `${entry.code}:${entry.questionId}`;
            if (emittedGuardTraceRef.current.has(gkey)) continue;
            emittedGuardTraceRef.current.add(gkey);
            briefTrackGuardQuestionTriggered(sink, {
              questionId: entry.questionId,
              ...(entry.signalKey ? { signalKey: entry.signalKey } : {}),
            });
          }
        })
        .catch(() => {
          /* non-blocking telemetry */
        });
    }, BRIEF_EXECUTION_DIAGNOSTIC_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(tid);
    };
  }, [enabled, auditId, sink, responsesFingerprint]);
}
