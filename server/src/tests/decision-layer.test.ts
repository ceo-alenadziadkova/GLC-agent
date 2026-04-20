import { describe, it, expect } from 'vitest';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import { createControlObjectV1 } from '../schemas/control-object.js';
import { DecisionLayer } from '../services/decision-layer.js';

function freshTechCo() {
  const co = createControlObjectV1('audit-test', 'tech_infrastructure');
  co.counts.fact = 20;
  co.counts.strategic_hypothesis = 2;
  co.counts.opinion = 1;
  co.counts.total_claims = 23;
  return co;
}

describe('DecisionLayer', () => {
  const dl = new DecisionLayer();

  it('routes high confidence and low hallucination rate to accept', () => {
    const co = freshTechCo();
    co.confidence = { overall: 90, factual: 90, strategic: 88, consistency: 92, feasibility: null };
    co.counts.statuses.likely_hallucination = 0;
    co.counts.statuses.risky_promise = 0;
    const r = dl.decide(co);
    expect(r.hint).toBe('accept');
    expect(r.reasoning).toContain('90');
  });

  it('routes medium confidence without structural errors to accept_with_warnings', () => {
    const co = freshTechCo();
    co.counts.fact = 10;
    co.confidence = { overall: 72, factual: 70, strategic: 72, consistency: 74, feasibility: null };
    co.errors.structural = [];
    co.counts.statuses.likely_hallucination = 1;
    co.counts.statuses.risky_promise = 0;
    co.errors.fixable = ['tone_check'];
    const r = dl.decide(co);
    expect(r.hint).toBe('accept_with_warnings');
  });

  it('routes low overall confidence to refine', () => {
    const co = freshTechCo();
    co.confidence = { overall: 55, factual: 50, strategic: 55, consistency: 60, feasibility: null };
    co.errors.structural = [];
    const r = dl.decide(co);
    expect(r.hint).toBe('refine');
    expect(r.reasoning.toLowerCase()).toContain('refine');
  });

  it('routes excess hallucination flags to refine', () => {
    const co = freshTechCo();
    co.confidence = { overall: 80, factual: 80, strategic: 78, consistency: 82, feasibility: null };
    co.errors.structural = [];
    co.counts.statuses.likely_hallucination = 5;
    co.counts.statuses.risky_promise = 0;
    const r = dl.decide(co);
    expect(r.hint).toBe('refine');
  });

  it('includes error buckets in active_error_types', () => {
    const co = freshTechCo();
    co.confidence = { overall: 90, factual: 90, strategic: 90, consistency: 90, feasibility: null };
    co.errors.fixable = ['a'];
    co.errors.structural = ['b'];
    co.errors.data_gaps = ['c'];
    const r = dl.decide(co);
    expect(r.active_error_types).toEqual(expect.arrayContaining(['a', 'b', 'c']));
  });

  describe('decideNarrow / decideForControlObject', () => {
    function narrowStrategyCo() {
      const co = createControlObjectV1('a1', 'strategy');
      co.context.governance_profile = 'narrow';
      co.confidence = { overall: 90, factual: 90, strategic: 88, consistency: 90, feasibility: null };
      co.errors = { fixable: [], structural: [], data_gaps: [] };
      co.human_attention_required = { required: false, reasons: [], requirements_met: null };
      return co;
    }

    it('decideForControlObject routes narrow profile to decideNarrow', () => {
      const co = narrowStrategyCo();
      const r = dl.decideForControlObject(co);
      expect(r.hint).toBe('accept');
    });

    it('decideNarrow refines on structural errors', () => {
      const co = narrowStrategyCo();
      co.errors.structural = ['strategy_model_vs_weighted_score_mismatch'];
      const r = dl.decideNarrow(co);
      expect(r.hint).toBe('refine');
    });

    it('decideNarrow accepts_with_warnings when human_attention is required but confidence is sufficient', () => {
      const co = narrowStrategyCo();
      co.confidence.overall = 75;
      co.human_attention_required = { required: true, reasons: ['review'], requirements_met: null };
      const r = dl.decideNarrow(co);
      expect(r.hint).toBe('accept_with_warnings');
    });

    it('decideNarrow refines when narrow_governance_incomplete is present', () => {
      const co = narrowStrategyCo();
      co.errors.structural = [SYSTEM_DEFAULTS.strategyNarrowGovernance.errorCodes.governanceIncomplete];
      const r = dl.decideNarrow(co);
      expect(r.hint).toBe('refine');
      expect(r.active_error_types).toContain(SYSTEM_DEFAULTS.decisionLayer.narrow.activeErrorTypeInvariantFailed);
    });
  });
});
