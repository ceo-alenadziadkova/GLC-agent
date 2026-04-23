import { describe, expect, it } from 'vitest';

import caseCatalog from '../artifacts/intake-case-patterns.v1.json' with { type: 'json' };
import { matchCasePatterns, countAnsweredInSet, evaluateCaseStopCondition } from '../core/case-matcher.js';
import { mergeOverlayIntoNextRecommended, resolveCaseOverlay } from '../core/case-overlay-resolver.js';
import type { IntakeCasePatternCatalogV1 } from '../core/case-pattern-types.js';
import { lintCasePatternsV1 } from '../core/lint-bank-policy/lint-case-patterns.js';

const catalog = caseCatalog as IntakeCasePatternCatalogV1;

describe('case-matcher', () => {
  it('lintCasePatternsV1 has no errors for the catalog', () => {
    const err = lintCasePatternsV1().filter(f => f.severity === 'error');
    expect(err).toEqual([]);
  });

  it('matches launching_service_solo_founder for PS + solo + Launching', () => {
    const matches = matchCasePatterns({
      responses: {
        a2: 'Professional Services',
        a4: 'Just me',
        a7: 'Launching',
      },
      confidenceByKey: {},
      catalog,
    });
    const keys = matches.map(m => m.caseKey);
    expect(keys).toContain('launching_service_solo_founder');
  });

  it('matches scaling_ecommerce for E-commerce and Scaling', () => {
    const matches = matchCasePatterns({
      responses: { a2: 'E-commerce', a7: 'Scaling' },
      confidenceByKey: {},
      catalog,
    });
    expect(matches.map(m => m.caseKey)).toContain('scaling_ecommerce_ops_bottleneck');
  });

  it('resolveCaseOverlay dedupes and mergeOverlay prepends unanswered overlays', () => {
    const m = matchCasePatterns({
      responses: { a2: 'E-commerce', a7: 'Scaling' },
      confidenceByKey: { operations_bottleneck: 'low' },
      catalog,
    });
    const one = m.find(c => c.caseKey === 'scaling_ecommerce_ops_bottleneck');
    expect(one).toBeDefined();
    const res = resolveCaseOverlay({
      matches: one ? [one] : [],
      confidenceByKey: { operations_bottleneck: 'low' },
    });
    expect(res.overlayQuestionIds.length).toBeGreaterThan(0);
    const merged = mergeOverlayIntoNextRecommended({
      nextRecommended: ['f1', 'a1'],
      overlayQuestionIds: res.overlayQuestionIds,
      visibleOrEligible: new Set(['a8', 'd2', 'b7', 'f1', 'a1']),
      responses: {},
    });
    expect(merged[0]).toBe('a8');
    expect(merged).toContain('f1');
  });

  it('countAnsweredInSet returns answered overlay count', () => {
    expect(
      countAnsweredInSet(['a1', 'a2'], {
        a1: 'x',
        a2: '',
      }),
    ).toBe(1);
  });

  it('matches early_validation_idea_stage for Launching', () => {
    const matches = matchCasePatterns({
      responses: { a7: 'Launching' },
      confidenceByKey: {},
      catalog,
    });
    expect(matches.map(m => m.caseKey)).toContain('early_validation_idea_stage');
  });

  it('evaluateCaseStopCondition checks signal floor', () => {
    const c = catalog.cases[0]!;
    expect(
      evaluateCaseStopCondition(c, {
        primary_problem: 'medium',
        audit_focus: 'low',
      }),
    ).toBe(false);
    expect(
      evaluateCaseStopCondition(c, {
        primary_problem: 'medium',
        audit_focus: 'medium',
      }),
    ).toBe(true);
  });
});
