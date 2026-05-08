import type { BriefQuestion, BriefResponses } from '../../../data/briefQuestions';
import { isReliableSource } from '../guards/intakeBriefGuards';

export function buildFastPassQuestionIds(args: {
  questions: BriefQuestion[];
  confidenceByQuestionId: Record<string, { confidence: 'high' | 'medium' | 'low' | 'unknown' }>;
}): string[] {
  const requiredIds = args.questions.filter(q => q.priority === 'required').map(q => q.id);
  const lowConfidenceIds = args.questions
    .filter(q => {
      const confidence = args.confidenceByQuestionId[q.id]?.confidence ?? 'unknown';
      return confidence === 'low' || confidence === 'unknown';
    })
    .map(q => q.id);
  const dedup = Array.from(new Set([...requiredIds, ...lowConfidenceIds, ...args.questions.map(q => q.id)]));
  return dedup.slice(0, 8);
}

export function buildProgressiveQueue(visibleQuestions: BriefQuestion[], ids: string[]): string[][] {
  const byId = new Set(visibleQuestions.map(q => q.id));
  const queue: string[][] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    if (id === 'a5' && byId.has('a11') && ids.includes('a11')) {
      queue.push(['a5', 'a11']);
      seen.add('a5');
      seen.add('a11');
      continue;
    }
    queue.push([id]);
    seen.add(id);
  }
  return queue;
}

export function buildPrecisionPassIds(args: {
  visibleQuestions: BriefQuestion[];
  adaptiveFastPassIds: string[];
  signalConfidenceByQuestionId: Record<string, { confidence: 'high' | 'medium' | 'low' | 'unknown' }>;
}): string[] {
  return args.visibleQuestions
    .filter(q => !args.adaptiveFastPassIds.includes(q.id))
    .filter(q => {
      const confidence = args.signalConfidenceByQuestionId[q.id]?.confidence ?? 'unknown';
      return confidence === 'low' || confidence === 'unknown';
    })
    .map(q => q.id);
}

export function buildSkippedByConfidenceIds(args: {
  visibleQuestions: BriefQuestion[];
  adaptiveFastPassIds: string[];
  signalConfidenceByQuestionId: Record<string, { confidence: 'high' | 'medium' | 'low' | 'unknown' }>;
  responses: BriefResponses;
}): string[] {
  return args.visibleQuestions
    .filter(q => !args.adaptiveFastPassIds.includes(q.id))
    .filter(q => {
      const confidence = args.signalConfidenceByQuestionId[q.id]?.confidence ?? 'unknown';
      return (confidence === 'high' || confidence === 'medium') && isReliableSource(args.responses[q.id]);
    })
    .map(q => q.id);
}
