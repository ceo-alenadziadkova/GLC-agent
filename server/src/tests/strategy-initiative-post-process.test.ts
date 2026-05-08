import { describe, expect, it } from 'vitest';
import type { DomainKey } from '@glc/intake-core';

import { StrategyInitiativeSchema } from '../schemas/domain-output.js';
import { buildStrategyBriefConstraintSnapshot } from '../services/strategy/strategy-brief-constraint-snapshot.js';
import {
  postProcessStrategyInitiatives,
  verifyInitiativeEvidence,
} from '../services/strategy/strategy-initiative-post-process.js';

const baseInit = StrategyInitiativeSchema.parse({
  id: 'X-1',
  title: 'Test initiative',
  description: 'Desc'.repeat(4),
  domain: 'marketing_utp',
  stage: 'growth',
  priority: 'high',
  impact: 'high',
  effort: 'medium',
  confidence: 0.7,
  context: { signals: ['Low conversion on primary landing'] },
  outcome: { description: 'Lift conversion' },
  scope: { includes: ['Landing CTA'], excludes: ['Full rebrand'] },
  execution_paths: [
    { type: 'fast', description: 'No-code', time_estimate: '5d' },
    { type: 'scalable', description: 'Custom build', time_estimate: '3w' },
  ],
  decision: { why_this: ['High leverage'] },
  evidence: { sources: [{ domain_key: 'marketing_utp', issue_id: 'i1' }] },
});

describe('strategy-initiative-post-process', () => {
  it('marks scalable path incompatible when budget band is low', () => {
    const brief = buildStrategyBriefConstraintSnapshot({ f5: { value: 'Under €500', source: 'client' } });
    expect(brief.budget_band).toBe('low');
    const [out] = postProcessStrategyInitiatives([baseInit], brief, new Map());
    const scalable = out.execution_paths.find((p) => p.type === 'scalable');
    expect(scalable?.incompatible).toBe(true);
  });

  it('marks scalable path incompatible when idea-stage signals are not ready', () => {
    const brief = buildStrategyBriefConstraintSnapshot({
      f_idea_1: { value: 'Mostly my assumption for now', source: 'client' },
      f_idea_2: { value: 'Broad audience for now', source: 'client' },
      f_idea_3: { value: ['Not ready to run tests yet'], source: 'client' },
    });
    const [out] = postProcessStrategyInitiatives([baseInit], brief, new Map());
    const scalable = out.execution_paths.find((p) => p.type === 'scalable');
    expect(scalable?.incompatible).toBe(true);
    expect(scalable?.incompatibility_reason).toBe('idea_signal_not_ready');
  });

  it('verifies evidence when issue id exists for domain', () => {
    const idx = new Map<DomainKey, Set<string>>([['marketing_utp', new Set(['i1'])]]);
    expect(verifyInitiativeEvidence(baseInit, idx)).toBe(true);
  });

  it('fails verification when issue id is unknown', () => {
    const bad = {
      ...baseInit,
      evidence: { sources: [{ domain_key: 'marketing_utp', issue_id: 'nope' }], cross_domain_dependencies: [] },
    };
    const idx = new Map<DomainKey, Set<string>>([['marketing_utp', new Set(['i1'])]]);
    expect(verifyInitiativeEvidence(bad, idx)).toBe(false);
  });

  it('requires cross-domain dependencies when coalition alignments indicate dependency reactions', () => {
    const idx = new Map<DomainKey, Set<string>>([['marketing_utp', new Set(['i1'])]]);
    expect(verifyInitiativeEvidence(baseInit, idx, { requireCrossDomainDependencies: true })).toBe(false);
    const withDependency = StrategyInitiativeSchema.parse({
      ...baseInit,
      evidence: {
        ...baseInit.evidence,
        cross_domain_dependencies: [{ domain_key: 'tech_infrastructure', hypothesis_id: 'tech_infrastructure:H1' }],
      },
    });
    expect(verifyInitiativeEvidence(withDependency, idx, { requireCrossDomainDependencies: true })).toBe(true);
  });
});
