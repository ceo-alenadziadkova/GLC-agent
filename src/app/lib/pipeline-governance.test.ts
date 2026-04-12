import { describe, it, expect } from 'vitest';
import {
  parseControlObjectGovernance,
  parseRefineRecommendedData,
  refineEventsForReviewBlock,
} from './pipeline-governance';
import type { PipelineEvent } from '../data/auditTypes';

describe('pipeline-governance', () => {
  it('parseControlObjectGovernance reads nested control_object', () => {
    const co = {
      decision_hint: 'accept_with_warnings',
      confidence: { overall: 77, factual: 80, strategic: 70, consistency: 75 },
      counts: {
        total_claims: 12,
        fact: 8,
        statuses: {
          confirmed_brief: 1,
          unverified: 2,
          likely_hallucination: 0,
          risky_promise: 1,
        },
      },
      context: { phase_id: 'seo_digital', execution_mode: 'normal', audit_id: 'a' },
      human_attention_required: { required: false, reasons: [] },
    };
    const parsed = parseControlObjectGovernance({ control_object: co });
    expect(parsed?.decision_hint).toBe('accept_with_warnings');
    expect(parsed?.confidence.overall).toBe(77);
    expect(parsed?.counts.statuses.risky_promise).toBe(1);
    expect(parsed?.counts.statuses.confirmed_external).toBe(0);
    expect(parsed?.counts.statuses.dependent_on_brief_assumption).toBe(0);
    expect(parsed?.counts.statuses.strategic_inconsistency).toBe(0);
  });

  it('parseRefineRecommendedData accepts refine payload with nested control_object', () => {
    const inner = {
      decision_hint: 'refine',
      confidence: { overall: 40, factual: 40, strategic: 40, consistency: 40 },
      counts: {
        total_claims: 3,
        fact: 3,
        statuses: {
          confirmed_brief: 0,
          unverified: 1,
          likely_hallucination: 2,
          risky_promise: 0,
        },
      },
      context: { phase_id: 'tech_infrastructure', execution_mode: 'normal', audit_id: 'b' },
      human_attention_required: { required: true, reasons: ['x'] },
    };
    const r = parseRefineRecommendedData({
      decision_hint: 'refine',
      reasoning: 'Low quality',
      active_error_types: ['e1'],
      control_object: inner,
    });
    expect(r?.decision_hint).toBe('refine');
    expect(r?.reasoning).toBe('Low quality');
    expect(r?.control_object?.confidence.overall).toBe(40);
  });

  it('refineEventsForReviewBlock filters by gate', () => {
    const events: PipelineEvent[] = [
      {
        id: 1,
        audit_id: 'x',
        phase: 2,
        event_type: 'refine_recommended',
        message: '',
        data: { decision_hint: 'refine', reasoning: 'r' },
        created_at: '',
      },
      {
        id: 2,
        audit_id: 'x',
        phase: 5,
        event_type: 'refine_recommended',
        message: '',
        data: {},
        created_at: '',
      },
    ];
    const block4 = refineEventsForReviewBlock(events, 4);
    expect(block4.map(e => e.phase)).toEqual([2]);
    const block7 = refineEventsForReviewBlock(events, 7);
    expect(block7.map(e => e.phase)).toEqual([5]);
    expect(refineEventsForReviewBlock(events, 0)).toEqual([]);
  });
});
