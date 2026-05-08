import { describe, expect, it } from 'vitest';

import { DomainOutputSchema } from '../schemas/domain-output.js';
import {
  normalizeDomainAgentToolInputForSchema,
  isDomainAgentOutputKey,
} from '../services/domain-output/domain-output-coalition-normalize.js';
import { GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION } from '../config/director-orchestration-policy.js';

const SUMMARY_PAD = 'S'.repeat(50);

function refEvidence() {
  return [{ type: 'collector', finding: 'observed crawl signal (fixture)' }];
}

function baseDomainPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    score: 4,
    label: 'Good',
    summary: SUMMARY_PAD,
    strengths: ['S1 matches minimum array length constraint here'],
    weaknesses: ['W1 likewise needs at least one weakness present'],
    quick_wins: [],
    unknown_items: [],
    ...payload,
  };
}

describe('domain-output-coalition-normalize', () => {
  it('identifies coalition domain phase keys only', () => {
    expect(isDomainAgentOutputKey('ux_conversion')).toBe(true);
    expect(isDomainAgentOutputKey('recon')).toBe(false);
  });

  it('rewrites shorthand cross_domain_refs to canonical peer hypotheses', () => {
    const raw = baseDomainPayload({
      issues: [
        {
          id: 'i1',
          severity: 'high',
          title: 'Issue title for fixture normalization path',
          description: 'Description text with enough chars for readability.',
          impact: 'Operational impact wording for downstream consumers.',
          confidence: 'high',
          evidence_refs: refEvidence(),
          data_source: 'auto_detected',
          status: 'confirmed',
        },
      ],
      recommendations: [
        {
          id: 'r1',
          title: 'Recommendation fixture title normalization',
          description: 'Recommendation body text with sufficient length.',
          priority: 'high',
          estimated_cost: 'moderate',
          estimated_time: '4–6 weeks',
          impact: 'Material upside when staffed with owner accountability.',
          evidence_refs: refEvidence(),
          data_source: 'auto_detected',
        },
      ],
      glc_director_execution: {
        schema_version: GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION,
        baseline: {
          actions: [
            {
              id: 'a1',
              title: 'Director action normalization cross refs',
              impact: 3,
              effort: 3,
              risk: 3,
              urgency: 3,
              confidence: 'medium',
              cross_domain_refs: ['UX:H2', 'BAD:FOO'],
            },
          ],
        },
      },
    });

    expect(DomainOutputSchema.safeParse(raw).success).toBe(false);

    const { value, mutated, mutationCodes } = normalizeDomainAgentToolInputForSchema(raw);
    expect(mutated).toBe(true);
    expect(mutationCodes).toContain('glc_director_cross_domain_refs_coerced');

    const parsed = DomainOutputSchema.safeParse(value);
    expect(parsed.success).toBe(true);
    const refs = parsed.data?.glc_director_execution?.baseline?.actions?.[0]?.cross_domain_refs;
    expect(refs).toEqual(['ux_conversion:H2']);
  });

  it('structures glc_director_execution JSON string and coerces refs', () => {
    const inner = {
      schema_version: GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION,
      baseline: {
        actions: [
          {
            id: 'a1',
            title: 'JSON blob action title text',
            impact: 3,
            effort: 3,
            risk: 3,
            urgency: 3,
            confidence: 'low',
            cross_domain_refs: ['SEO:H1'],
          },
        ],
      },
    };

    const raw = baseDomainPayload({
      issues: [
        {
          id: 'i1',
          severity: 'medium',
          title: 'Issue baseline for blob string coercion',
          description: 'Supporting description stays short but valid.',
          impact: 'Operational risk when refs use shorthand prefixes.',
          confidence: 'high',
          evidence_refs: refEvidence(),
          data_source: 'auto_detected',
        },
      ],
      recommendations: [
        {
          id: 'r1',
          title: 'Recommendation for blob coercion path',
          description: 'Body text satisfies schema length expectations.',
          priority: 'medium',
          estimated_cost: 'low',
          estimated_time: '2 weeks',
          impact: 'Incremental improvement scoped to backlog.',
          evidence_refs: refEvidence(),
        },
      ],
      glc_director_execution: JSON.stringify(inner),
    });

    const { value, mutationCodes } = normalizeDomainAgentToolInputForSchema(raw);
    expect(mutationCodes).toContain('glc_director_execution_blob_structured');
    expect(DomainOutputSchema.safeParse(value).success).toBe(true);
    const refs = DomainOutputSchema.parse(value).glc_director_execution?.baseline?.actions?.[0]?.cross_domain_refs;
    expect(refs).toEqual(['seo_digital:H1']);
  });

  it('downgrades high severity when status is non-confirmed', () => {
    const raw = baseDomainPayload({
      issues: [
        {
          id: 'i1',
          severity: 'high',
          title: 'Unverified severity hygiene fixture topic',
          description: 'Agents sometimes emit high severity with unverified posture.',
          impact: 'Downstream readers may overweight risk without confirmation.',
          confidence: 'low',
          evidence_refs: refEvidence(),
          data_source: 'inferred',
          status: 'unverified',
        },
      ],
      recommendations: [
        {
          id: 'r1',
          title: 'Rationale recommendation for coerce suite',
          description: 'Description remains stable while issues are repaired.',
          priority: 'high',
          estimated_cost: 'low',
          estimated_time: '1 sprint',
          impact: 'Meaningful change when owners commit capacity.',
          evidence_refs: refEvidence(),
        },
      ],
    });

    expect(DomainOutputSchema.safeParse(raw).success).toBe(false);
    const parsed = DomainOutputSchema.safeParse(normalizeDomainAgentToolInputForSchema(raw).value);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.issues?.[0]?.severity).toBe('medium');
  });

  it('appends benchmark hint when impact has percentages without citation words', () => {
    const raw = baseDomainPayload({
      issues: [
        {
          id: 'i1',
          severity: 'medium',
          title: 'Issue holder for recommendation impact coercion',
          description: 'Parallel issue row keeps domain output structurally complete.',
          impact: 'Throughput concerns when KPIs cite ranges without sources.',
          confidence: 'high',
          evidence_refs: refEvidence(),
          data_source: 'auto_detected',
        },
      ],
      recommendations: [
        {
          id: 'r1',
          title: 'Recommendation with bare percent wording',
          description: 'We want deterministic suffix instead of rejecting the tool payload.',
          priority: 'high',
          estimated_cost: 'moderate',
          estimated_time: '6 weeks',
          impact: '+10–20% uplift',
          evidence_refs: refEvidence(),
        },
      ],
    });

    expect(DomainOutputSchema.safeParse(raw).success).toBe(false);
    const { value } = normalizeDomainAgentToolInputForSchema(raw);
    expect(DomainOutputSchema.safeParse(value).success).toBe(true);
    const impact = DomainOutputSchema.parse(value).recommendations[0]?.impact;
    expect(impact).toMatch(/benchmark/i);
    expect(impact).toContain('+10–20%');
  });

  it('strips incompatible non-confirmed status when evidence_refs are absent', () => {
    const raw = baseDomainPayload({
      issues: [
        {
          id: 'i1',
          severity: 'low',
          title: 'Supporting issue keeps minimum issue count intact',
          description: 'Narrative about coverage without blocking recommendation repair.',
          impact: 'Low severity keeps focus on recommendation optional fields.',
          confidence: 'high',
          evidence_refs: refEvidence(),
          data_source: 'auto_detected',
        },
      ],
      recommendations: [
        {
          id: 'r1',
          title: 'Recommendation with orphan status posture',
          description: 'Model sometimes emits unverified without rationale evidence.',
          priority: 'medium',
          estimated_cost: 'unknown',
          estimated_time: 'TBD',
          impact: 'Directional hypothesis until benchmark work lands.',
          status: 'unverified',
        },
      ],
    });

    expect(DomainOutputSchema.safeParse(raw).success).toBe(false);
    const parsed = DomainOutputSchema.safeParse(normalizeDomainAgentToolInputForSchema(raw).value);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.recommendations?.[0]?.status).toBeUndefined();
    expect(parsed.data?.recommendations?.[0]?.verification_method).toBeUndefined();
  });

  it('coerces invented verification_method labels (e.g. tech_stack_detect) to heuristic', () => {
    const raw = baseDomainPayload({
      issues: [
        {
          id: 'i1',
          severity: 'medium',
          title: 'Issue with bogus verification_method emitted by tooling heuristics',
          description:
            'Models sometimes invent verifier labels tied to collectors (stack fingerprints, headers, etc.).',
          impact: 'Directional posture until multi-source corroboration is available.',
          confidence: 'high',
          evidence_refs: refEvidence(),
          data_source: 'auto_detected',
          status: 'confirmed',
          verification_method: 'tech_stack_detect',
        },
      ],
      recommendations: [
        {
          id: 'r1',
          title: 'First recommendation row holds minimum array length contract',
          description: 'Body text satisfies schema boundaries for deterministic parsing.',
          priority: 'high',
          estimated_cost: 'low',
          estimated_time: '3 weeks',
          impact: 'Stabilizes backlog sequencing for remediation owners.',
          evidence_refs: refEvidence(),
        },
        {
          id: 'r2',
          title: 'Second row triggers separate verification validation path',
          description: 'Coercion must run independently from other recommendation entries.',
          priority: 'medium',
          estimated_cost: 'moderate',
          estimated_time: '8 weeks',
          impact: 'Targeted uplift when staffed with accountable owners.',
          evidence_refs: refEvidence(),
          verification_method: 'tech_stack_detect',
        },
      ],
    });

    expect(DomainOutputSchema.safeParse(raw).success).toBe(false);
    const { value, mutationCodes } = normalizeDomainAgentToolInputForSchema(raw);
    expect(mutationCodes.filter((c) => c.includes('verification_method_unknown_coerced')).length).toBeGreaterThan(
      0,
    );

    const parsed = DomainOutputSchema.safeParse(value);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.issues?.[0]?.verification_method).toBe('heuristic');
    expect(parsed.data?.recommendations?.[1]?.verification_method).toBe('heuristic');
  });

  it('maps unknown verification_method to not_assessed when issue status is not_assessed', () => {
    const raw = baseDomainPayload({
      issues: [
        {
          id: 'i1',
          severity: 'low',
          title: 'Not assessed row with bogus verification tag',
          description: 'Zod forbids heuristic alongside explicit not-assessed readiness.',
          impact: 'Advisory framing until stakeholder validation completes.',
          confidence: 'low',
          evidence_refs: refEvidence(),
          data_source: 'inferred',
          status: 'not_assessed',
          verification_method: 'tech_stack_detect',
        },
      ],
      recommendations: [
        {
          id: 'r1',
          title: 'Recommendation keeps minimum recommendation count invariant',
          description: 'Required recommendation body for coalition schema acceptance.',
          priority: 'low',
          estimated_cost: 'low',
          estimated_time: '1 week',
          impact: 'Operational hygiene when discovery coverage is incomplete.',
          evidence_refs: refEvidence(),
        },
      ],
    });

    expect(DomainOutputSchema.safeParse(raw).success).toBe(false);
    const parsed = DomainOutputSchema.safeParse(normalizeDomainAgentToolInputForSchema(raw).value);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.issues?.[0]?.verification_method).toBe('not_assessed');
  });
});
