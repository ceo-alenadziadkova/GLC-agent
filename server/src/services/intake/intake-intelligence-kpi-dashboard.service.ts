import { PIPELINE_EVENT_TYPES } from '../../config/pipeline-event-types.js';
import { supabase } from '../supabase.js';

type KpiRowData = {
  kind?: 'question_shown' | 'drop_off';
  question_id?: string | null;
  client_session_id?: string | null;
};

type SessionStats = {
  shownCount: number;
  droppedOff: boolean;
  lastShownQuestionId: string | null;
};

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export async function fetchIntakeIntelligenceKpiDashboard() {
  const { data, error } = await supabase
    .from('pipeline_events')
    .select('created_at,data')
    .in('event_type', [PIPELINE_EVENT_TYPES.intakeIntelligenceQuestionShown, PIPELINE_EVENT_TYPES.intakeIntelligenceDropOff])
    .order('created_at', { ascending: true })
    .limit(10000);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ created_at?: string; data?: KpiRowData }>;
  const sessions = new Set<string>();
  const shownByQuestion = new Map<string, number>();
  const dropOffByQuestion = new Map<string, number>();
  const sessionStats = new Map<string, SessionStats>();
  let questionShown = 0;
  let dropOff = 0;
  for (const row of rows) {
    const payload = row.data ?? {};
    const sessionId = payload.client_session_id ?? null;
    if (sessionId) {
      sessions.add(sessionId);
      if (!sessionStats.has(sessionId)) {
        sessionStats.set(sessionId, { shownCount: 0, droppedOff: false, lastShownQuestionId: null });
      }
    }
    if (payload.kind === 'question_shown') {
      questionShown += 1;
      const key = payload.question_id ?? 'unknown';
      shownByQuestion.set(key, (shownByQuestion.get(key) ?? 0) + 1);
      if (sessionId) {
        const stats = sessionStats.get(sessionId);
        if (stats) {
          stats.shownCount += 1;
          stats.lastShownQuestionId = key;
        }
      }
    }
    if (payload.kind === 'drop_off') {
      dropOff += 1;
      if (sessionId) {
        const stats = sessionStats.get(sessionId);
        if (stats) {
          stats.droppedOff = true;
          if (stats.lastShownQuestionId) {
            dropOffByQuestion.set(
              stats.lastShownQuestionId,
              (dropOffByQuestion.get(stats.lastShownQuestionId) ?? 0) + 1,
            );
          }
        }
      }
    }
  }
  const sessionsWithShown = [...sessionStats.values()].filter(item => item.shownCount > 0);
  const medianQuestionsToReadiness = computeMedian(
    sessionsWithShown.filter(item => !item.droppedOff).map(item => item.shownCount),
  );
  const sessionFunnel = {
    started: sessions.size,
    withQuestionShown: sessionsWithShown.length,
    droppedOff: [...sessionStats.values()].filter(item => item.droppedOff).length,
    reachedAuditReady: sessionsWithShown.filter(item => !item.droppedOff).length,
  };
  const topDropOffHotspots = [...shownByQuestion.entries()]
    .map(([questionId, shownCount]) => {
      const dropOffCount = dropOffByQuestion.get(questionId) ?? 0;
      return {
        questionId,
        shownCount,
        dropOffCount,
        dropOffRate: shownCount > 0 ? dropOffCount / shownCount : 0,
      };
    })
    .sort((a, b) => b.dropOffRate - a.dropOffRate || b.dropOffCount - a.dropOffCount || b.shownCount - a.shownCount)
    .slice(0, 5);
  return {
    sessions: sessions.size,
    questionShown,
    dropOff,
    dropOffRate: questionShown > 0 ? dropOff / questionShown : 0,
    medianQuestionsToReadiness,
    sessionFunnel,
    confidenceMovedRate: null,
    topDropOffHotspots,
  };
}
