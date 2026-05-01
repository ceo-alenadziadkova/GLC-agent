import { describe, expect, it } from 'vitest';

import { buildTailoredQuestionsForResponses } from '../services/intake/intake-tailored-questions.service.js';
import { buildDeterministicIntakeFollowupBundle } from '../services/intake/intake-followup-candidates.service.js';

describe('intake-followup-candidates.service', () => {
  it('buildDeterministicIntakeFollowupBundle matches tailored-questions for the same responses', () => {
    const raw = { a5: { value: 'Acme', source: 'client' } } as Record<string, unknown>;
    const a = buildDeterministicIntakeFollowupBundle(raw);
    const b = buildTailoredQuestionsForResponses(raw);
    expect(a).toEqual(b);
  });
});
