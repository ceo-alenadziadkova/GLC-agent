import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { makeWebsitePathFullBrief } from '../../../../server/src/tests/bank-brief-fixtures';
import { briefResponsesToIntakeMap, useIntakeBankMetrics, useIntakeWizard } from '../useIntakeWizard';

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

  it('uses surface for visible recommended totals (client_form vs consultant)', () => {
    const raw = makeWebsitePathFullBrief();
    const brief = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, { value: v as never, source: 'client' as const }]),
    );
    const { result: consultant } = renderHook(() =>
      useIntakeBankMetrics(brief, 'self_serve', 'consultant_interview'),
    );
    const { result: clientForm } = renderHook(() => useIntakeBankMetrics(brief, 'self_serve', 'client_form'));
    expect(clientForm.current.visibleRecommendedTotal).toBeLessThanOrEqual(consultant.current.visibleRecommendedTotal);
    expect(consultant.current.visibleRecommendedTotal).toBeGreaterThan(clientForm.current.visibleRecommendedTotal);
  });
});

describe('useIntakeWizard', () => {
  it('exposes fewer steps on client_form than consultant_interview for website-path fixture', () => {
    const raw = makeWebsitePathFullBrief();
    const value = { ...raw };
    const { result: consultant } = renderHook(() =>
      useIntakeWizard({
        value,
        onChange: () => {},
        collectionMode: 'self_serve',
        surface: 'consultant_interview',
      }),
    );
    const { result: clientForm } = renderHook(() =>
      useIntakeWizard({
        value,
        onChange: () => {},
        collectionMode: 'self_serve',
        surface: 'client_form',
      }),
    );
    expect(clientForm.current.totalSteps).toBeLessThan(consultant.current.totalSteps);
  });
});
