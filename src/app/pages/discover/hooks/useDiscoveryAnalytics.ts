import { useEffect, useRef } from 'react';
import type { IntakeVersionTuple } from '../../../data/auditTypes';
import {
  createDiscoveryAnalyticsSink,
  discoveryTrackQuestionShown,
  discoveryTrackResultsViewed,
} from '../../../lib/discovery-analytics';

export function useDiscoveryAnalytics(params: {
  intakeVersions: IntakeVersionTuple | null;
  sessionToken: string | null;
  currentId: string | null;
  currentIdx: number;
  showResults: boolean;
}) {
  const { intakeVersions, sessionToken, currentId, currentIdx, showResults } = params;
  const intakeVersionsRef = useRef<IntakeVersionTuple | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const sinkRef = useRef<ReturnType<typeof createDiscoveryAnalyticsSink> | null>(null);
  const lastShownKeyRef = useRef<string>('');

  intakeVersionsRef.current = intakeVersions;
  sessionTokenRef.current = sessionToken;

  if (sinkRef.current == null) {
    sinkRef.current = createDiscoveryAnalyticsSink({
      getIntakeVersions: () => intakeVersionsRef.current,
      getDiscoveryToken: () => sessionTokenRef.current,
    });
  }

  useEffect(() => {
    const sink = sinkRef.current;
    return () => {
      void sink?.flush();
      sink?.dispose();
    };
  }, []);

  useEffect(() => {
    if (showResults || !currentId) return;
    const sink = sinkRef.current;
    if (!sink) return;
    const key = `${currentIdx}:${currentId}`;
    if (lastShownKeyRef.current === key) return;
    lastShownKeyRef.current = key;
    discoveryTrackQuestionShown(sink, { questionId: currentId, stepIndex: currentIdx });
  }, [currentId, currentIdx, showResults]);

  useEffect(() => {
    if (!showResults) return;
    const sink = sinkRef.current;
    if (sink) discoveryTrackResultsViewed(sink);
  }, [showResults]);

  return sinkRef;
}
