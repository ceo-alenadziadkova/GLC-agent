import { describe, expect, it } from 'vitest';
import {
  buildFastPassQuestionIds,
  buildPrecisionPassIds,
  buildProgressiveQueue,
  buildSkippedByConfidenceIds,
} from './intake-brief-queue';

describe('intake-brief-queue', () => {
  const questions = [
    { id: 'a5', priority: 'required' },
    { id: 'a11', priority: 'optional' },
    { id: 'a2', priority: 'required' },
  ] as Array<{ id: string; priority: 'required' | 'optional' }>;

  it('builds fast pass with required and low-confidence ids', () => {
    const ids = buildFastPassQuestionIds({
      questions: questions as never,
      confidenceByQuestionId: {
        a5: { confidence: 'high' },
        a11: { confidence: 'low' },
        a2: { confidence: 'high' },
      },
    });
    expect(ids).toContain('a5');
    expect(ids).toContain('a11');
    expect(ids).toContain('a2');
  });

  it('groups a5 and a11 into one progressive step', () => {
    const queue = buildProgressiveQueue(questions as never, ['a5', 'a11', 'a2']);
    expect(queue[0]).toEqual(['a5', 'a11']);
    expect(queue[1]).toEqual(['a2']);
  });

  it('builds precision ids by confidence', () => {
    const ids = buildPrecisionPassIds({
      visibleQuestions: questions as never,
      adaptiveFastPassIds: ['a5'],
      signalConfidenceByQuestionId: {
        a11: { confidence: 'low' },
        a2: { confidence: 'high' },
      },
    });
    expect(ids).toEqual(['a11']);
  });

  it('builds skipped ids by confidence and reliable source', () => {
    const ids = buildSkippedByConfidenceIds({
      visibleQuestions: questions as never,
      adaptiveFastPassIds: ['a5'],
      signalConfidenceByQuestionId: {
        a11: { confidence: 'high' },
        a2: { confidence: 'medium' },
      },
      responses: {
        a11: { value: 'v', source: 'client' },
        a2: { value: 'v', source: 'unknown' },
      },
    });
    expect(ids).toEqual(['a11']);
  });
});
