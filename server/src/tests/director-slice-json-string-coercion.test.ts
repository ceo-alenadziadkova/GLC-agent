import { describe, expect, it } from 'vitest';
import {
  coerceDirectorSliceJsonBlob,
  GlcDirectorOrchestrationSliceFromToolInputSchema,
  GlcDirectorOrchestrationSliceSchema,
} from '../schemas/glc-director-orchestration-slice.js';
import { DomainOutputSchema } from '../schemas/domain-output.js';

const minimalSlice = GlcDirectorOrchestrationSliceSchema.parse({
  schema_version: 1,
  baseline: {
    actions: [
      {
        id: 'a1',
        title: 'Baseline action',
        impact: 3,
        effort: 3,
        risk: 2,
        urgency: 3,
        confidence: 'medium',
        dependencies: [],
      },
    ],
  },
});

describe('coerceDirectorSliceJsonBlob', () => {
  it('returns undefined for null, empty string, and absent-like values', () => {
    expect(coerceDirectorSliceJsonBlob(undefined)).toBeUndefined();
    expect(coerceDirectorSliceJsonBlob(null)).toBeUndefined();
    expect(coerceDirectorSliceJsonBlob('')).toBeUndefined();
    expect(coerceDirectorSliceJsonBlob('   ')).toBeUndefined();
  });

  it('passes through objects', () => {
    expect(coerceDirectorSliceJsonBlob(minimalSlice)).toEqual(minimalSlice);
  });

  it('parses JSON object strings', () => {
    expect(coerceDirectorSliceJsonBlob(JSON.stringify(minimalSlice))).toEqual(minimalSlice);
  });

  it('returns original string when JSON is not an object', () => {
    expect(coerceDirectorSliceJsonBlob('"hello"')).toBe('"hello"');
    expect(coerceDirectorSliceJsonBlob('[1,2]')).toBe('[1,2]');
  });
});

describe('GlcDirectorOrchestrationSliceFromToolInputSchema', () => {
  it('accepts stringified slice', () => {
    const parsed = GlcDirectorOrchestrationSliceFromToolInputSchema.safeParse(JSON.stringify(minimalSlice));
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toEqual(minimalSlice);
  });
});

describe('DomainOutputSchema + stringified glc_director_execution', () => {
  it('parses director bundle when submitted as JSON string', () => {
    const pad = 'Word '.repeat(20);
    const parsed = DomainOutputSchema.safeParse({
      score: 3,
      label: 'Moderate',
      summary: pad,
      strengths: ['S'],
      weaknesses: ['W'],
      issues: [
        {
          id: 'issue-1',
          severity: 'medium',
          title: 'Issue',
          description:
            'Description of the issue long enough for DomainOutput summary and issue validation.',
          impact: 'Medium',
          confidence: 'high',
          evidence_refs: [{ type: 'stub', finding: 'collector saw X' }],
          data_source: 'auto_detected',
        },
      ],
      quick_wins: [],
      recommendations: [
        {
          id: 'rec-1',
          title: 'Fix',
          description: 'Actionable recommendation text for the coercion test.',
          priority: 'high',
          estimated_cost: 'Low',
          estimated_time: '1 week',
          impact: 'Moderate uplift expected',
        },
      ],
      unknown_items: [],
      glc_director_execution: JSON.stringify(minimalSlice),
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.glc_director_execution).toEqual(minimalSlice);
    }
  });
});
