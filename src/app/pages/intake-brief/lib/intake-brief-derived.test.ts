import { describe, expect, it } from 'vitest';
import {
  buildIntelligenceByQuestionId,
  buildRawQuestionList,
  buildReadinessPanel,
  buildSignalConfidenceByQuestionId,
  buildVisibleQuestions,
} from './intake-brief-derived';

describe('intake-brief-derived', () => {
  it('builds intelligence map by question id', () => {
    const mapped = buildIntelligenceByQuestionId({
      questions: [{ id: 'a1', intelligence: { whyAsked: 'x', semanticDomain: 'market', decisionImpact: [] } }],
    });
    expect(mapped.a1?.whyAsked).toBe('x');
  });

  it('builds visible questions with tailored override', () => {
    const list = buildVisibleQuestions({
      rawQuestionList: [{ id: 'a1', question: 'Old' } as never],
      responses: {},
      twoPhaseWave: 'tailored',
      tailoredLabelOverrides: { a1: 'New' },
      intelligenceByQuestionId: {},
    });
    expect(list[0]?.question).toBe('New');
  });

  it('builds raw question list merge in review', () => {
    const list = buildRawQuestionList({
      phase: 'review',
      twoPhaseWave: 'prebrief',
      questions: [{ id: 'a1' } as never],
      tailoredPayload: { questions: [{ id: 'a2' } as never] },
    });
    expect(list.map(q => q.id)).toEqual(['a1', 'a2']);
  });

  it('builds signal confidence map', () => {
    const byQuestion = buildSignalConfidenceByQuestionId({
      critical_signals: { by_key: {} },
      readiness: { trace: [] },
    });
    expect(typeof byQuestion).toBe('object');
  });

  it('builds readiness panel', () => {
    const panel = buildReadinessPanel({
      answered: 0,
      intakeSchemaSnapshot: null,
      questions: [],
    });
    expect(panel.state).toBe('pristine');
  });
});
