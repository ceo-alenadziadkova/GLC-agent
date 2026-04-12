import { describe, it, expect } from 'vitest';
import { sanitizeJsonForEvaluationDataset } from '../lib/evaluation-dataset-sanitize.js';

describe('sanitizeJsonForEvaluationDataset', () => {
  it('redacts URLs and emails in strings', () => {
    const out = sanitizeJsonForEvaluationDataset({
      text: 'See https://example.com/path and mail@acme.co',
    }) as Record<string, unknown>;
    expect(out.text).toBe('See [redacted_url] and [redacted_email]');
  });

  it('redacts values for sensitive keys', () => {
    const out = sanitizeJsonForEvaluationDataset({
      summary: 'ok',
      company_url: 'https://client.com',
      nested: { phone: '+1-555-0100' },
    }) as Record<string, unknown>;
    expect(out.company_url).toBe('[redacted]');
    expect(out.summary).toBe('ok');
    expect((out.nested as Record<string, unknown>).phone).toBe('[redacted]');
  });

  it('recurses into arrays', () => {
    const out = sanitizeJsonForEvaluationDataset({
      items: [{ url: 'https://a.com' }],
    }) as Record<string, unknown>;
    expect((out.items as unknown[])[0]).toEqual({ url: '[redacted_url]' });
  });
});
