import { describe, expect, it } from 'vitest';
import { ReconOutputSchema } from '../schemas/domain-output.js';
import { normalizeReconRuntimeOutput } from '../services/recon/recon-output-normalizer.js';

function baseReconRaw(): Record<string, unknown> {
  return {
    company_name: 'GLC',
    industry: 'Professional Services',
    industry_subcategory: null,
    location: 'Palma',
    estimated_size: '2-10',
    business_model: 'Services',
    target_audience: 'SMB owners',
    key_services_products: [],
    value_proposition: 'Automation and IT consulting',
    competitive_landscape_notes: null,
    regional_relevance: null,
    initial_observations: [],
    suggested_interview_questions: [],
  };
}

describe('normalizeReconRuntimeOutput', () => {
  it('coerces target list fields from string to array', () => {
    const raw = baseReconRaw();
    raw.key_services_products = 'Audit; Automation';
    raw.initial_observations = '- Signal A\n- Signal B';
    raw.suggested_interview_questions = '1) Question A\n2) Question B';

    const normalized = normalizeReconRuntimeOutput(raw);

    expect(normalized.appliedFields).toEqual([
      'key_services_products',
      'initial_observations',
      'suggested_interview_questions',
    ]);
    expect(normalized.normalized.key_services_products).toEqual(['Audit', 'Automation']);
    expect(normalized.normalized.initial_observations).toEqual(['Signal A', 'Signal B']);
    expect(normalized.normalized.suggested_interview_questions).toEqual(['Question A', 'Question B']);
  });

  it('keeps strict schema boundary after normalization', () => {
    const raw = baseReconRaw();
    raw.key_services_products = 'Service A';
    raw.initial_observations = 'Observation A';
    raw.suggested_interview_questions = 'Question A';
    raw.location = { city: 'Palma' };

    const normalized = normalizeReconRuntimeOutput(raw);
    const parsed = ReconOutputSchema.safeParse(normalized.normalized);

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path[0] === 'location')).toBe(true);
    }
  });
});
