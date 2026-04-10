import { describe, expect, it } from 'vitest';

import { buildBriefSchemaSnapshot } from '@glc/intake-core';
import { currentIntakeVersionTuple } from '@glc/intake-core';

describe('buildBriefSchemaSnapshot', () => {
  it('returns visible bank ids with labels and version tuple', () => {
    const tuple = currentIntakeVersionTuple();
    const schema = buildBriefSchemaSnapshot({
      responses: { a2: 'hospitality', a5: 'multi_page_website' },
      productMode: 'full',
      collectionMode: 'self_serve',
      surface: 'consultant_interview',
      intakeVersionTuple: tuple,
    });
    expect(schema.intake_versions).toEqual(tuple);
    expect(schema.visible.length).toBeGreaterThan(0);
    expect(schema.questions.length).toBeGreaterThan(0);
    const a2 = schema.questions.find(q => q.id === 'a2');
    expect(a2?.label).toBe('Industry');
    expect(schema.derived.ai_readiness_score).toBeGreaterThanOrEqual(0);
    expect(schema.derived.confidence_overall).toBeGreaterThanOrEqual(0);
    expect(schema.derived.confidence_overall).toBeLessThanOrEqual(1);
  });

  it('uses null surface when caller passes undefined (discovery-style)', () => {
    const schema = buildBriefSchemaSnapshot({
      responses: {},
      productMode: 'full',
      collectionMode: 'discovery',
      surface: undefined,
      intakeVersionTuple: currentIntakeVersionTuple(),
    });
    expect(schema.surface).toBeNull();
    expect(schema.collection_mode).toBe('discovery');
  });
});
