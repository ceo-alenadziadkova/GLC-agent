import { describe, expect, it } from 'vitest';

import { computeNextRecommended } from '@glc/intake-core';
import type { IntakeQuestionStub } from '@glc/intake-core';

const stub = (id: string, priority: IntakeQuestionStub['priority']): IntakeQuestionStub => ({
  id,
  priority,
});

describe('computeNextRecommended', () => {
  it('lists required before recommended in visible order', () => {
    const stubs = [stub('r1', 'required'), stub('x1', 'recommended'), stub('r2', 'required')];
    const out = computeNextRecommended({
      visibleOrdered: ['x1', 'r1', 'r2'],
      stubs,
      responses: {},
      missingForReport: [],
      max: 10,
    });
    expect(out).toEqual(['r1', 'r2', 'x1']);
  });

  it('appends optional primaries for missing report domains after recommended', () => {
    const stubs = [stub('r1', 'required'), stub('x1', 'recommended'), stub('c4', 'optional')];
    const out = computeNextRecommended({
      visibleOrdered: ['c4', 'r1', 'x1'],
      stubs,
      responses: {},
      missingForReport: ['seo_digital'],
      max: 10,
    });
    expect(out).toEqual(['r1', 'x1', 'c4']);
  });

  it('respects max length', () => {
    const stubs = [stub('a', 'required'), stub('b', 'required'), stub('c', 'required')];
    const out = computeNextRecommended({
      visibleOrdered: ['a', 'b', 'c'],
      stubs,
      responses: {},
      missingForReport: [],
      max: 2,
    });
    expect(out).toEqual(['a', 'b']);
  });
});
