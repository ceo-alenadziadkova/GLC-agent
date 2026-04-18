import { describe, it, expect, vi } from 'vitest';

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: null, error: null })),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    })),
  },
}));

import {
  CONTROL_OBJECT_VERSIONS,
  createControlObjectV1,
} from '../schemas/control-object.js';
import { FactChecker } from '../services/fact-checker.js';
import type { DomainResult, DomainKey } from '../types/audit.js';

describe('CONTROL_OBJECT v1 contract', () => {
  it('createControlObjectV1 sets version keys aligned with ControlObjectVersions', () => {
    const co = createControlObjectV1('a1', 'seo_digital');
    expect(co.versions).toEqual(CONTROL_OBJECT_VERSIONS);
    expect(co.versions.system_version).toBe(CONTROL_OBJECT_VERSIONS.system_version);
    expect(co.decision_hint).toBe('accept');
  });

  it('FactChecker.buildControlObject leaves decision_hint at factory default (DecisionLayer owns hint)', () => {
    const fc = new FactChecker();
    const result: DomainResult = {
      score: 3,
      label: 'Moderate',
      summary: 'x'.repeat(60),
      strengths: ['s1'],
      weaknesses: ['w1'],
      issues: [],
      quick_wins: [],
      recommendations: [],
      unknown_items: [],
    };
    const verification = fc.verify(result, 'seo_digital' as DomainKey, {});
    const co = fc.buildControlObject(verification, 'seo_digital', 'audit-x', 3);
    expect(co.decision_hint).toBe('accept');
    expect(co.context.audit_id).toBe('audit-x');
    expect(co.context.phase_id).toBe('seo_digital');
    expect(typeof co.confidence.overall).toBe('number');
    expect(co.trace.claim_sources).toEqual([]);
  });
});
