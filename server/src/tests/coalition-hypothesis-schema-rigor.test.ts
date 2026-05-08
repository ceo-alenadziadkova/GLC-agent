import { describe, expect, it } from 'vitest';

import { DomainHypothesisDraftSchema } from '../schemas/director-collaboration/hypothesis.js';

describe('coalition hypothesis schema rigor', () => {
  it('rejects mismatched domain prefix in hypothesis ids', () => {
    const parsed = DomainHypothesisDraftSchema.safeParse({
      schema_version: 1,
      audit_id: '11111111-1111-4111-8111-111111111111',
      domain_key: 'tech_infrastructure',
      acknowledged_situation: {
        snapshot_id: '22222222-2222-4222-8222-222222222222',
        domain_mode_mapping: 'Tech priorities map to growth-stage reliability constraints.',
      },
      hypotheses: [
        {
          id: 'marketing_utp:H1',
          type: 'constraint',
          statement: 'Infrastructure bottlenecks delay reliable releases.',
          rationale: 'Observed variability in runtime and deployment signals.',
          confidence: 'medium',
          evidence_refs: [{ type: 'http_response', finding: 'Intermittent 5xx responses under load.' }],
          data_source: 'auto_detected',
          expected_business_outcomes: ['Higher release reliability'],
          expected_costs: ['Refactoring sprint'],
          expected_dependencies_hints: ['security_compliance:H1'],
        },
        {
          id: 'tech_infrastructure:H2',
          type: 'lever',
          statement: 'Caching and compression can improve time-to-value.',
          rationale: 'Current headers indicate optimization gaps and unstable latency.',
          confidence: 'medium',
          evidence_refs: [{ type: 'performance_headers', finding: 'compression.enabled=false' }],
          data_source: 'auto_detected',
          expected_business_outcomes: ['Faster page load'],
          expected_costs: ['Low implementation effort'],
          expected_dependencies_hints: [],
        },
        {
          id: 'tech_infrastructure:H3',
          type: 'risk',
          statement: 'Unstable observability may hide regressions.',
          rationale: 'Telemetry confidence is low based on current evidence coverage.',
          confidence: 'low',
          evidence_refs: [{ type: 'tech_stack_detect', finding: 'Monitoring tooling not clearly detected.' }],
          data_source: 'inferred',
          expected_business_outcomes: ['Fewer hidden incidents'],
          expected_costs: [],
          expected_dependencies_hints: [],
        },
      ],
      raised_questions: [],
      analysis_mode: 'researched',
    });
    expect(parsed.success).toBe(false);
  });
});

