import { describe, expect, it } from 'vitest';

import { ClientSituationSnapshotSchema } from '../schemas/director-collaboration/client-situation.js';

describe('coalition client situation schema rigor', () => {
  it('rejects low-confidence envelope without high-impact assumptions', () => {
    const parsed = ClientSituationSnapshotSchema.safeParse({
      schema_version: 1,
      audit_id: '11111111-1111-4111-8111-111111111111',
      generated_at: '2026-05-08T00:00:00.000Z',
      entity_type: 'mvp',
      maturity: {
        product_clarity: 3,
        audience_clarity: 3,
        positioning_strength: 3,
        channel_readiness: 2,
        resource_constraints: 2,
        overall_tier: 'actionable',
      },
      dominant_constraint: 'conversion',
      constraint_chain: ['traffic follows after conversion'],
      resource_envelope: {
        bandwidth: 'low',
        risk_tolerance: 'medium',
        urgency: 'high',
        confidence: 'low',
      },
      strategic_mode: 'growth',
      domain_weights: {
        tech_infrastructure: 1,
        security_compliance: 1,
        seo_digital: 1,
        ux_conversion: 2,
        marketing_utp: 1.5,
        automation_processes: 1,
      },
      assumptions: [
        {
          id: 'A1',
          statement: 'Team can reallocate effort in two weeks.',
          impact: 'medium',
          validation_method: 'Consultant confirmation',
          invalidates_if_wrong: [],
        },
      ],
      clarifying_questions: [],
      evidence_refs: [{ type: 'recon', finding: 'Landing copy is broad and low-intent.' }],
      data_quality_score: 55,
      unknown_items: [],
      analysis_mode: 'researched',
    });
    expect(parsed.success).toBe(false);
  });
});

