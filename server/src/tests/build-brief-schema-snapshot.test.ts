import { describe, expect, it } from 'vitest';

import {
  buildBriefSchemaSnapshot,
  currentIntakeVersionTuple,
  getIntakeIntelligenceContract,
  projectIntakeIntelligenceRequiredNow,
} from '@glc/intake-core';

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

  it('applies admin_presale executionContext curation in schema output', () => {
    const schema = buildBriefSchemaSnapshot({
      responses: {
        a2: 'Healthcare',
        a5: 'multi_page_website',
        f1: ['Too much manual work and operational overload'],
        f2: ['Process automation and efficiency (less manual work and handoffs)'],
      },
      productMode: 'full',
      collectionMode: 'interview',
      surface: 'consultant_interview',
      intakeVersionTuple: currentIntakeVersionTuple(),
      executionContext: 'admin_presale',
    });
    expect(schema.deferred).toContain('f5');
    expect(schema.visible).not.toContain('f5');
    expect(schema.next_recommended).not.toContain('f5');
  });

  it('exposes question intelligence only when required_now contract is complete', () => {
    const schema = buildBriefSchemaSnapshot({
      responses: {},
      productMode: 'full',
      collectionMode: 'self_serve',
      surface: 'client_form',
      intakeVersionTuple: currentIntakeVersionTuple(),
    });

    for (const q of schema.questions) {
      const projected = projectIntakeIntelligenceRequiredNow(getIntakeIntelligenceContract(q.id));
      if (projected === undefined) {
        expect(q.intelligence, `question ${q.id}`).toBeUndefined();
      } else {
        expect(q.intelligence).toEqual(projected);
      }
    }
  });
});
