import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createControlObjectV1,
  HUMAN_ATTENTION_CONTENT_REMEDIATION_BLOCKED,
} from '../schemas/control-object/index.js';
import type { DomainResult } from '../types/audit.js';
import * as ruleEngine from '../config/rule-engine.js';

const { insertMock, fromMock } = vi.hoisted(() => {
  const insertMock = vi.fn().mockResolvedValue({ error: null });
  const fromMock = vi.fn().mockReturnValue({ insert: insertMock });
  return { insertMock, fromMock };
});

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: fromMock,
  },
}));

import {
  applyAutoRemediation,
  canAutoRemediate,
  softenAbsolutesInResult,
} from '../services/remediation.js';

function baseDomainResult(over: Partial<DomainResult> = {}): DomainResult {
  return {
    score: 4,
    label: 'Good',
    summary: 'We are always guaranteed 100% uptime.',
    strengths: [],
    weaknesses: [],
    issues: [],
    quick_wins: [],
    recommendations: [],
    unknown_items: [],
    ...over,
  };
}

describe('canAutoRemediate', () => {
  it('returns false when structural errors exist', () => {
    const co = createControlObjectV1('a1', 'tech_infrastructure');
    co.errors.structural.push('score_evidence_mismatch');
    expect(canAutoRemediate(co)).toBe(false);
  });

  it('returns false when confidence is below 70', () => {
    const co = createControlObjectV1('a1', 'tech_infrastructure');
    co.confidence.overall = 69;
    expect(canAutoRemediate(co)).toBe(false);
  });

  it('returns false when human attention is required', () => {
    const co = createControlObjectV1('a1', 'tech_infrastructure');
    co.human_attention_required.required = true;
    expect(canAutoRemediate(co)).toBe(false);
  });
});

describe('softenAbsolutesInResult', () => {
  it('replaces absolute phrasing', () => {
    const r = baseDomainResult();
    expect(softenAbsolutesInResult(r)).toBe(true);
    expect(r.summary).not.toMatch(/\b100%\b/i);
    expect(r.summary).toContain('large share');
  });
});

describe('applyAutoRemediation', () => {
  beforeEach(() => {
    vi.stubEnv('FEATURE_AUTO_REMEDIATION', 'true');
    insertMock.mockClear();
    fromMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns 0 when feature flag is off', async () => {
    vi.stubEnv('FEATURE_AUTO_REMEDIATION', 'false');
    const co = createControlObjectV1('a1', 'seo_digital');
    co.decision_hint = 'accept_with_warnings';
    co.errors.fixable.push('forbidden_absolutes');
    const result = baseDomainResult();
    const n = await applyAutoRemediation({
      auditId: 'a1',
      controlObject: co,
      cleanedOutput: result,
      phaseNumber: 3,
    });
    expect(n).toBe(0);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('returns 0 when decision is refine', async () => {
    const co = createControlObjectV1('a1', 'seo_digital');
    co.decision_hint = 'refine';
    co.errors.fixable.push('forbidden_absolutes');
    const result = baseDomainResult();
    const n = await applyAutoRemediation({
      auditId: 'a1',
      controlObject: co,
      cleanedOutput: result,
      phaseNumber: 3,
    });
    expect(n).toBe(0);
  });

  it('applies tone remediation for forbidden_absolutes and logs row', async () => {
    const co = createControlObjectV1('a1', 'seo_digital');
    co.decision_hint = 'accept_with_warnings';
    co.confidence.overall = 80;
    co.errors.fixable.push('forbidden_absolutes');
    const result = baseDomainResult();
    const n = await applyAutoRemediation({
      auditId: 'a1',
      controlObject: co,
      cleanedOutput: result,
      phaseNumber: 3,
    });
    expect(n).toBe(1);
    expect(co.auto_remediation?.applied).toHaveLength(1);
    expect(co.errors.fixable.includes('forbidden_absolutes')).toBe(false);
    expect(insertMock).toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith('audit_remediations');
  });

  it('does not mutate output for security_compliance when rule is content-only (phase profile tone_only)', async () => {
    const origGetRules = ruleEngine.getRulesForErrorType.bind(ruleEngine);
    const spy = vi.spyOn(ruleEngine, 'getRulesForErrorType').mockImplementation((errorType: string) => {
      if (errorType === 'synthetic_content_fix') {
        return [
          {
            error_type: 'synthetic_content_fix',
            applies_to_agents: [2],
            instruction_append: 'x',
            priority: 99,
            auto_remediate: true,
            remediation_type: 'content',
            remediation_action: 'soften_absolutes',
          },
        ];
      }
      return origGetRules(errorType);
    });

    const co = createControlObjectV1('a1', 'security_compliance');
    co.decision_hint = 'accept_with_warnings';
    co.confidence.overall = 80;
    co.errors.fixable.push('synthetic_content_fix');
    const result = baseDomainResult();
    const before = result.summary;

    const n = await applyAutoRemediation({
      auditId: 'a1',
      controlObject: co,
      cleanedOutput: result,
      phaseNumber: 2,
    });

    expect(n).toBe(0);
    expect(result.summary).toBe(before);
    expect(co.human_attention_required.required).toBe(true);
    expect(co.human_attention_required.reasons).toContain(HUMAN_ATTENTION_CONTENT_REMEDIATION_BLOCKED);
    expect(insertMock).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it('respects disableAutoRemediate', async () => {
    const co = createControlObjectV1('a1', 'marketing_utp');
    co.decision_hint = 'accept';
    co.confidence.overall = 90;
    co.errors.fixable.push('forbidden_absolutes');
    const result = baseDomainResult();
    const n = await applyAutoRemediation({
      auditId: 'a1',
      controlObject: co,
      cleanedOutput: result,
      phaseNumber: 5,
      disableAutoRemediate: true,
    });
    expect(n).toBe(0);
    expect(insertMock).not.toHaveBeenCalled();
  });
});
