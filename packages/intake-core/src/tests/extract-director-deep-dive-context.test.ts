import { describe, expect, it } from 'vitest';
import { extractDirectorDeepDiveContextFromBrief } from '../core/extract-director-deep-dive-context-from-brief.js';

describe('extractDirectorDeepDiveContextFromBrief', () => {
  it('maps goals and constraints from known question ids with BriefResponseEntry cells', () => {
    const ctx = extractDirectorDeepDiveContextFromBrief('marketing_utp', {
      f1: { value: 'Grow MRR in EU mid-market', source: 'client' },
      f6: { value: 'Small team, no dedicated marketer', source: 'client' },
    });
    expect(ctx.goals).toEqual(['Grow MRR in EU mid-market']);
    expect(ctx.constraints).toContain('Small team, no dedicated marketer');
  });

  it('parses week-based timeframe into days when present', () => {
    const ctx = extractDirectorDeepDiveContextFromBrief('default', {
      f4: '4 weeks to first meaningful leads',
    });
    expect(ctx.timeframe_days).toBe(28);
  });

  it('includes ideal customer (b1) in marketing goals when present', () => {
    const ctx = extractDirectorDeepDiveContextFromBrief('marketing_utp', {
      b1: { value: 'B2B ops teams 50–500 employees', source: 'client' },
    });
    expect(ctx.goals).toContain('B2B ops teams 50–500 employees');
  });

  it('prefers repeat-purchase signal (b7) in automation_processes constraint list', () => {
    const ctx = extractDirectorDeepDiveContextFromBrief('automation_processes', {
      b7: { value: 'Mostly repeat customers', source: 'client' },
    });
    expect(ctx.constraints).toContain('Mostly repeat customers');
  });
});
