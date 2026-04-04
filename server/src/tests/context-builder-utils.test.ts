import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/supabase.js', () => ({
  supabase: {},
}));

import { ContextBuilder, extractPrimaryCompetitor } from '../services/context-builder.js';
import type { AgentContext } from '../services/context-builder.js';

function minimalCtx(over: Partial<AgentContext>): AgentContext {
  return {
    company_url: 'https://example.com',
    company_name: 'Ex',
    industry: 'Hospitality',
    recon: null,
    collected_data: {},
    previous_domains: [],
    review_notes: [],
    domain_weight: 1,
    brief_responses: {},
    brief_response_sources: {},
    intake_data_quality_score: 0,
    intake_readiness_badge: 'low',
    post_audit_questions: [],
    recon_prefills: {},
    recon_conflicts: [],
    failed_domains: [],
    instructions: 'You are a test agent.',
    ...over,
  };
}

describe('extractPrimaryCompetitor', () => {
  it('returns first competitor from array input', () => {
    expect(extractPrimaryCompetitor(['Hotel ABC', 'Hotel DEF'])).toBe('Hotel ABC');
  });

  it('returns first competitor from CSV input', () => {
    expect(extractPrimaryCompetitor('Hotel ABC, Hotel DEF, Hotel XYZ')).toBe('Hotel ABC');
  });

  it('returns null for empty/whitespace-only values', () => {
    expect(extractPrimaryCompetitor('   , ; \n ')).toBeNull();
    expect(extractPrimaryCompetitor(['', '   ', '\n'])).toBeNull();
  });
});

describe('ContextBuilder.formatPrompt', () => {
  it('uses question-bank labels for v1 intake ids in Client Brief section', () => {
    const builder = new ContextBuilder();
    const { prompt } = builder.formatPrompt(
      minimalCtx({
        brief_responses: { a1: 'Boutique hotel in Palma', f1: 'Scale direct bookings' },
        brief_response_sources: { a1: 'client', f1: 'client' },
      }),
    );
    expect(prompt).toContain('Business description (one sentence)');
    expect(prompt).toContain('Boutique hotel in Palma');
    expect(prompt).toContain('Main business problem to solve');
    expect(prompt).toContain('Scale direct bookings');
  });

  it('includes AI readiness line when intake_ai_readiness_score is set', () => {
    const builder = new ContextBuilder();
    const { prompt } = builder.formatPrompt(
      minimalCtx({ intake_ai_readiness_score: 72 }),
    );
    expect(prompt).toContain('Intake AI readiness (heuristic, question-bank)');
    expect(prompt).toContain('72/100');
  });

  it('omits AI readiness line when score is undefined', () => {
    const builder = new ContextBuilder();
    const { prompt } = builder.formatPrompt(minimalCtx({}));
    expect(prompt).not.toContain('Intake AI readiness (heuristic');
  });
});
