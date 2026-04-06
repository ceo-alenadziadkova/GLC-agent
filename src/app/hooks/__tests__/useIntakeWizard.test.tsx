import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { briefResponsesToIntakeMap, useIntakeBankMetrics } from '../useIntakeWizard';

describe('briefResponsesToIntakeMap', () => {
  it('preserves structured cells', () => {
    const m = briefResponsesToIntakeMap({
      x: { value: 'hello', source: 'client' },
    });
    expect(m.x).toEqual({ value: 'hello', source: 'client' });
  });
});

describe('useIntakeBankMetrics', () => {
  it('derives bank coverage from partial responses', () => {
    const { result } = renderHook(() =>
      useIntakeBankMetrics({
        f1: { value: 'Grow', source: 'client' },
        a1: { value: 'Co — SaaS', source: 'client' },
        a5: { value: 'Yes, multi-page site', source: 'client' },
        intake_company_name: { value: 'Co', source: 'client' },
        intake_industry: { value: 'SaaS / Software', source: 'client' },
        intake_company_website: { value: 'https://example.com', source: 'client' },
      }),
    );
    expect(result.current.dataQualityPct).toBeGreaterThanOrEqual(0);
    expect(result.current.dataQualityPct).toBeLessThanOrEqual(100);
    expect(result.current.visibleRequiredTotal).toBeGreaterThan(0);
  });
});
