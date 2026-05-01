import { describe, expect, it } from 'vitest';

import { buildTailoredQuestionsForResponses } from '../services/intake/intake-tailored-questions.service.js';

describe('buildTailoredQuestionsForResponses', () => {
  it('excludes minimum-context ids from nextRecommended order', () => {
    const r = {
      a5: { value: 'https://example.com', source: 'client' as const },
      a11: { value: 'Example', source: 'client' as const },
      a12: { value: 'Example Inc', source: 'client' as const },
      a2: { value: 'SaaS / Software', source: 'client' as const },
      a7: { value: 'Launching', source: 'client' as const },
      f1: { value: 'x'.repeat(40), source: 'client' as const },
      f2: { value: 'Express', source: 'client' as const },
      f8: { value: 'x'.repeat(40), source: 'client' as const },
      a10: { value: 'Under $100K', source: 'client' as const },
      a6: { value: '2–4', source: 'client' as const },
      b1: { value: 'x'.repeat(40), source: 'client' as const },
    };
    const out = buildTailoredQuestionsForResponses(r as Record<string, unknown>);
    const minimum = new Set([
      'a5',
      'a11',
      'a12',
      'a2',
      'f1',
      'f2',
      'f8',
      'a7',
      'b1',
      'a10',
      'a6',
    ]);
    for (const id of out.questionIds) {
      expect(minimum.has(id), `tail id ${id} should not be baseline-only (check bank)`).toBe(false);
    }
  });
});
