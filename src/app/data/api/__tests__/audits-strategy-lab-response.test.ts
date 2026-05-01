import { describe, expect, it } from 'vitest';

import { ApiError } from '../../api-error';

import { parseStrategyLabContextPatchResponse } from '../audits-strategy-lab';

describe('parseStrategyLabContextPatchResponse', () => {
  it('accepts a full merged context object from the server', () => {
    const out = parseStrategyLabContextPatchResponse({
      strategy_lab_context: {
        company_stage: 'growth',
        budget_band: 'unknown',
        team_scale: 'unknown',
        director_stage2_domains: ['tech_infrastructure'],
      },
    });
    expect(out.strategy_lab_context.company_stage).toBe('growth');
    expect(out.strategy_lab_context.director_stage2_domains).toEqual(['tech_infrastructure']);
  });

  it('accepts an empty strategy_lab_context shell', () => {
    const out = parseStrategyLabContextPatchResponse({ strategy_lab_context: {} });
    expect(out.strategy_lab_context).toEqual({});
  });

  it('rejects missing strategy_lab_context', () => {
    expect(() => parseStrategyLabContextPatchResponse({})).toThrow(ApiError);
    try {
      parseStrategyLabContextPatchResponse({});
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe('MALFORMED_RESPONSE_BODY');
    }
  });

  it('rejects invalid domain keys in director_stage2_domains', () => {
    expect(() =>
      parseStrategyLabContextPatchResponse({
        strategy_lab_context: { director_stage2_domains: ['not_a_domain' as never] },
      }),
    ).toThrow(ApiError);
  });
});
