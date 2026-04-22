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
    expect(schema.legal).toBeDefined();
    expect(schema.legal?.a2?.legal_basis).toBe('contract');
    expect(schema.readiness).toBeDefined();
    expect(['flow_ready', 'blocked']).toContain(schema.readiness.flowReadinessStatus);
    expect(['audit_ready', 'blocked', 'ready_with_caveats']).toContain(schema.readiness.auditReadinessStatus);
    expect(Array.isArray(schema.readiness.trace)).toBe(true);
    expect(schema.intake_versions.sequencingVersion).toBeDefined();
    expect(schema.critical_signals).toBeDefined();
    expect(schema.critical_signals.summary).toHaveProperty('satisfied');
    expect(schema.remediation_queue).toBeDefined();
    expect(Array.isArray(schema.remediation_queue)).toBe(true);
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

  it('omits incomplete intelligence metadata from question rows', () => {
    const schema = buildBriefSchemaSnapshot({
      responses: {},
      productMode: 'full',
      collectionMode: 'self_serve',
      surface: 'client_form',
      intakeVersionTuple: currentIntakeVersionTuple(),
    });

    const a1 = schema.questions.find(q => q.id === 'a1');
    expect(a1).toBeDefined();
    expect(a1?.intelligence).toBeUndefined();
  });
});
